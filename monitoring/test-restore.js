import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function testRestore() {
  try {
    console.log('Testing Get-ComputerRestorePoint...')
    const { stdout, stderr } = await execAsync('powershell -Command "Get-ComputerRestorePoint"')
    console.log('STDOUT:', stdout)
    console.log('STDERR:', stderr)
  } catch (error) {
    console.error('Error:', error)
  }
}

testRestore()