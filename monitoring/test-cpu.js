import si from 'systeminformation'

async function test() {
  try {
    const cpu = await si.cpu()
    console.log('CPU info:', cpu)
    const load = await si.currentLoad()
    console.log('Current load:', load)
  } catch (error) {
    console.error('Error:', error)
  }
}

test()