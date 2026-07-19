const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Atlas connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
});

function addIdTransform(schema) {
  schema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  });
}

const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  is_verified: { type: Boolean, default: false },
  otp_code: { type: String, default: null },
  otp_expires_at: { type: Date, default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

const tradeSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  symbol: { type: String, required: true },
  trade_date: { type: String, required: true }, // kept as 'YYYY-MM-DD' string for easy prefix/range queries
  entry_price: { type: Number, required: true, default: 0 },
  exit_price: { type: Number, required: true, default: 0 },
  quantity: { type: Number, required: true, default: 0 },
  total_amount: { type: Number, required: true, default: 0 },
  pnl_amount: { type: Number, required: true, default: 0 },
  pnl_percent: { type: Number, required: true, default: 0 },
  direction: { type: String, default: 'Long' },
  stop_loss: { type: Number, default: 0 },
  target: { type: Number, default: 0 },
  risk_reward: { type: String, default: '1:0' },
  strategy: { type: String, default: null },
  outcome_summary: { type: String, default: null },
  trade_analysis: { type: String, default: null },
  rules_followed: { type: [String], default: [] },
  screenshots: { type: [String], default: [] },
  entry_confidence: { type: Number, default: 5 },
  satisfaction_rating: { type: Number, default: 5 },
  emotional_state: { type: String, default: null },
  mistakes_made: { type: [String], default: [] },
  lessons_learned: { type: String, default: null },
  strike_price: { type: Number, default: null },
  option_type: { type: String, default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

tradeSchema.index({ user_id: 1, trade_date: 1 });

addIdTransform(userSchema);
addIdTransform(tradeSchema);

const User = mongoose.model('User', userSchema);
const Trade = mongoose.model('Trade', tradeSchema);

module.exports = { User, Trade, mongoose };
