const Client = require('rippled-ws-client')
const moment = require('moment');
const { parseBalanceChanges } = require('ripple-lib-transactionparser')

const app = async (account, cb, returnTx) => {
  let counter = 0; // Counter to track the number of transactions processed

  const display = result => {
    if (result?.transactions) {
      result?.transactions.forEach(r => {
        if (counter >= 50) return; // Exit loop if counter reaches 100

        const { tx, meta } = r
        let direction = 'other'
        if (tx?.Account === account) direction = 'sent'
        if (tx?.Destination === account) direction = 'received'
        // const moment = (new Date((tx.date + 946684800) * 1000))

        const formattedDate = moment(new Date((tx.date + 946684800) * 1000)).format('DDMMYY_HHmmss');


        const balanceChanges = parseBalanceChanges(meta)
        if (Object.keys(balanceChanges).indexOf(account) > -1) {
          const mutations = balanceChanges[account]
          mutations.forEach(mutation => {
            const currency = mutation.counterparty === ''
              ? 'XRP'
              : `${mutation.counterparty}.${mutation.currency}`

            const isFee = direction === 'sent' && Number(mutation.value) * -1 * 1000000 === Number(tx?.Fee)
              ? 1
              : 0

            const fee = direction === 'sent'
              ? Number(tx?.Fee) / 1000000 * -1
              : 0

            cb({

              ledger: tx.ledger_index,
              direction: direction,
              txtype: tx.TransactionType,
              date: moment,
              currency: currency,
              amount: mutation.value,
              is_fee: isFee,
              fee: fee,
              hash: tx.hash,
              _tx: returnTx ? tx : undefined,
              _meta: returnTx ? meta : undefined
            })

            counter++; // Increment counter after processing each transaction
          })
        }
      })
    }
  }

  const client = await new Client('wss://xrplcluster.com', {
    NoUserAgent: true
  })

  const getMore = async marker => {
    const result = await client.send({
      command: 'account_tx',
      account,
      limit: 10,
      marker
    })

    display(result)
    return result?.marker
  }

  let proceed = await getMore()

  while (proceed && counter < 100) { // Exit loop if counter reaches 100
    proceed = await getMore(proceed)
  }

  client.close()
}

const fields = [

  'ledger',

  'amount',

  

]

module.exports = {
  app,
  fields
}
