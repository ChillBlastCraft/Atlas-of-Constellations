import { getPlayerStats } from './wapi-client.js'

const username = process.argv[2]
if (!username) {
    console.error('Usage: node getPlayer.js <username>')
    process.exit(1)
}

try {
    const data = await getPlayerStats(username)
    console.log(JSON.stringify(data, null, 2))
} catch (err) {
    console.error('Error:', err.message || err)
    process.exit(1)
}
