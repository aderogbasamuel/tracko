const BASE_URL = process.env.BMONI_BASE_URL!;
const API_KEY = process.env.BMONI_API_KEY!;

async function bmoniFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`BMONI error ${res.status}: ${errText}`);
  }
  return res.json();
}

export async function getTraderTransactions() {
  const userId = process.env.BMONI_TRADER_USER_ID!;
  const smartWalletId = process.env.BMONI_TRADER_SMART_WALLET_ID!;
  return bmoniFetch(`/v1/users/${userId}/transactions/${smartWalletId}`);

}

export async function getTraderBalances() {
  const userId = process.env.BMONI_TRADER_USER_ID!; // Debug log
  return bmoniFetch(`/v1/users/${userId}/smart-wallets/account/balances`);
}

export async function getTraderWallets() {
  const userId = process.env.BMONI_TRADER_USER_ID!;
  return bmoniFetch(`/v1/users/${userId}/smart-wallets/account/wallets`);
}

// Checks recent transactions for one matching the order's expected amount,
// not yet reconciled. Simple matching for demo purposes.
export async function findMatchingPayment(amount: number) {
  const data = await getTraderTransactions();
  const transactions = data.transactions || data.data || [];
  return transactions.find(
    (tx: any) => tx.amount === amount && tx.status === "completed" && tx.direction === "credit"
  );
}