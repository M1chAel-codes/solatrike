import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useState } from 'react'

const ROUTES = [
  { id: 'route1', name: 'Maingate → Health Center', price: 0.001 },
  { id: 'route2', name: 'Maingate → Faculty of Law', price: 0.001 },
  { id: 'route3', name: 'Maingate → Hall 1', price: 0.001 },
  { id: 'other', name: '🔀 Other / Custom Route', price: 0.001 },
]

const TRICYCLE_WALLET = '6Q3VKqu4ewxErvN1dbfAAvqku6GZQZjkSpineaej1Tvk'

export default function PaymentPage() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePayment = async () => {
    if (!publicKey || !selectedRoute) return
    setLoading(true)
    setStatus('Processing payment...')
    try {
      const recipient = new PublicKey(TRICYCLE_WALLET)
      const lamports = selectedRoute.price * LAMPORTS_PER_SOL
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipient,
          lamports,
        })
      )
      const signature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(signature, 'processed')
      setStatus(`✅ Payment confirmed! Enjoy your ride. TX: ${signature.slice(0, 20)}...`)
    } catch (err) {
      setStatus(`❌ Payment failed: ${err.message}`)
    }
    setLoading(false)
  }

  return (
    <div className="payment-page">
      <h2>Select Your Route</h2>
      <div className="routes">
        {ROUTES.map(route => (
          <div
            key={route.id}
            className={`route-card ${selectedRoute?.id === route.id ? 'selected' : ''}`}
            onClick={() => setSelectedRoute(route)}
          >
            <p>{route.name}</p>
            <span>{route.price} SOL</span>
          </div>
        ))}
      </div>

      {!publicKey && (
        <p className="hint">👆 Connect your Phantom wallet above to pay</p>
      )}

      {publicKey && selectedRoute && (
        <button onClick={handlePayment} disabled={loading}>
          {loading ? 'Processing...' : `Pay ${selectedRoute.price} SOL`}
        </button>
      )}

      {status && <p className="status">{status}</p>}
    </div>
  )
}