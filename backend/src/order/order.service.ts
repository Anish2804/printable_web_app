// FILE: services/api/src/order/order.service.ts
// All order business logic — create, find, update status.
// Routes call these functions; no DB logic lives in routes.

import { nanoid } from "nanoid";
import Razorpay from "razorpay";
import { Order, IOrder, IOrderFile, OrderStatus } from "./order.model";
import { deleteFromR2 } from "../file/r2.service";
import fs from "fs";
import path from "path";

const configPath = path.resolve(process.cwd(), "store.config.json");
const storeConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Pricing constants
const BW_PER_PAGE    = storeConfig.pricing.bwPerPage;   // B&W page cost
const COLOR_PER_PAGE = storeConfig.pricing.colorPerPage;   // Colour page cost

function calcFileAmount(
  pages:  number,
  copies: number,
  colour: boolean,
  duplex: boolean
): number {
  const perPage = colour ? COLOR_PER_PAGE : BW_PER_PAGE;
  let total = perPage * pages * copies;
  // Duplex discount
  if (duplex && pages > 1) total = total - Math.round(total * (storeConfig.pricing.duplexDiscountPercent / 100));
  return total;
}

// Generate a short readable order ID e.g. "ABC123"
function generateOrderId(): string {
  return nanoid(6).toUpperCase();
}

// ─── Create Order ─────────────────────────────────────────────────────────────

export interface FileInput {
  fileName:      string;
  fileUrl: string;
  pages:         number;
  copies:        number;
  colour:        boolean;
  duplex:        boolean;
  orientation:   string;
  pageRange:     string;
}

interface CreateOrderInput {
  files:       FileInput[];   // ≥1 files
  paymentMode: "online" | "offline";
  userName:    string;
}

interface CreateOrderResult {
  orderId:          string;
  razorpayOrderId?: string;
  amount:           number;   // in paise for Razorpay, in rupees otherwise
}

export async function createOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  // Build per-file records with pre-calculated amounts
  const files: IOrderFile[] = input.files.map((f) => ({
    fileName:      f.fileName,
    fileUrl: f.fileUrl,
    pages:         f.pages,
    copies:        f.copies,
    colour:        f.colour,
    duplex:        f.duplex,
    orientation:   f.orientation || 'portrait',
    pageRange:     f.pageRange || 'all',
    amount:        calcFileAmount(f.pages, f.copies, f.colour, f.duplex),
  }));

  const totalAmount = files.reduce((s, f) => s + f.amount, 0);
  const orderId = generateOrderId();
  let razorpayOrderId: string | undefined;

  // For online payments, create a Razorpay order first
  if (input.paymentMode === "online") {
    const razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const rzpOrder = await razorpay.orders.create({
      amount:   totalAmount * 100, // Razorpay uses paise
      currency: "INR",
      receipt:  orderId,
    });

    razorpayOrderId = rzpOrder.id;
  }

  await Order.create({
    orderId,
    userName: input.userName,
    files,
    paymentMode: input.paymentMode,
    totalAmount,
    status: "pending_payment",
    razorpayOrderId,
  });

  return { orderId, razorpayOrderId, amount: totalAmount * 100 };
}

// ─── Get Single Order ──────────────────────────────────────────────────────────

export async function getOrderById(orderId: string): Promise<IOrder | null> {
  return Order.findOne({ orderId: orderId.toUpperCase() }).lean<IOrder>();
}

// ─── Get All Orders ────────────────────────────────────────────────────────────

export async function getAllOrders(): Promise<IOrder[]> {
  return Order.find({}).sort({ createdAt: -1 }).lean<IOrder[]>();
}

// ─── Get Orders by Status ──────────────────────────────────────────────────────

export async function getOrdersByStatus(status: OrderStatus): Promise<IOrder[]> {
  return Order.find({ status }).sort({ createdAt: -1 }).lean<IOrder[]>();
}

// ─── Update Order Status ───────────────────────────────────────────────────────

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<IOrder | null> {
  const updated = await Order.findOneAndUpdate(
    { orderId: orderId.toUpperCase() },
    { status },
    { new: true }
  );

  if (!updated) return null;

  // If completed or cancelled, delete associated files from Cloudinary to protect privacy/storage
  if (status === "completed" || status === "cancelled") {
    console.log(`[OrderService] Order ${orderId} reached final state '${status}'. Cleaning up Cloudflare R2...`);
    for (const file of updated.files) {
      if (file.fileUrl) {
        // Extract R2 key from the full URL
        const parts = file.fileUrl.split("/");
        const key = parts[parts.length - 1];
        
        deleteFromR2(key).catch((err) => {
          console.error(`[OrderService] Failed to delete file ${file.fileName} from R2:`, err);
        });
      }
    }
  }

  return updated.toObject() as IOrder;
}

// ─── Confirm Cash Payment ──────────────────────────────────────────────────────

export async function confirmCashPayment(
  orderId: string
): Promise<IOrder | null> {
  return Order.findOneAndUpdate(
    { orderId: orderId.toUpperCase(), paymentMode: "offline" },
    { status: "paid" },
    { new: true }
  ).lean<IOrder>();
}

// ─── Mark Online Payment Paid ──────────────────────────────────────────────────

export async function markOnlinePaid(
  razorpayOrderId:  string,
  razorpayPaymentId: string
): Promise<IOrder | null> {
  return Order.findOneAndUpdate(
    { razorpayOrderId },
    { status: "paid", razorpayPaymentId },
    { new: true }
  ).lean<IOrder>();
}