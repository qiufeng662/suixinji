import { pathToFileURL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

const p = path.join(process.env.APPDATA || '', 'suixinji', 'suixinji', 'pets', 'avatar.jpg')
const fileUrl = pathToFileURL(p).href
const pet = fileUrl.replace(/^file:/, 'petfile:')
console.log('abs', p)
console.log('fileUrl', fileUrl)
console.log('pet', pet)
const u = new URL(pet)
console.log('pathname', u.pathname)
let decoded = decodeURIComponent(u.pathname)
if (/^\/[A-Za-z]:/.test(decoded)) decoded = decoded.slice(1)
if (process.platform === 'win32') decoded = decoded.replace(/\//g, '\\')
console.log('decoded', decoded)
console.log('exists', fs.existsSync(decoded), fs.existsSync(decoded) ? fs.statSync(decoded).size : 0)
