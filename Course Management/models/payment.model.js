const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    enrollment: { type: mongoose.Schema.Types.ObjectId, ref: "Enrollment", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ["EGP","USD","EUR","SAR", "KWD", "GBP", "BHR", "AED"], default: "EGP" },
    method: { type: String, enum: ["credit_card", "paypal", "stripe", "bank_transfer"], required: true },
    status: { type: String, enum: ["pending", "completed", "failed", "refunded"], default: "pending" },
    transactionId: { type: String },
    paymentDate: { type: Date, default: Date.now },
    notes: { type: String }
});

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;