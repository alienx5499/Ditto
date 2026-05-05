#!/usr/bin/env -S npx tsx

import { main } from '../src/index.js';

main(process.argv).then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
