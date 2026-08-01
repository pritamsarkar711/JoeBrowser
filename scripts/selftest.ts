/**
 * Plain-Node entry for the self-test suite (no Electron binary needed).
 *   npm run selftest:node
 */
import { runSelfTests } from '../src/main/selftest'

runSelfTests()
  .then((failures) => {
    process.exitCode = failures === 0 ? 0 : 1
  })
  .catch((e) => {
    console.error('Self-test crashed:', e)
    process.exitCode = 1
  })
