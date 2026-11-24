// Gere o valor uma única vez em um terminal privado e copie-o diretamente para o Secret.
import {randomBytes} from 'node:crypto';
console.log(randomBytes(32).toString('base64url'));
