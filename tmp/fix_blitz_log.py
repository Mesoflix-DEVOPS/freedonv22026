import os

file_path = r"packages\bot-web-ui\src\pages\copytrading\CopyTradingLogic.ts"

with open(file_path, 'rb') as f:
    content = f.read()

# Try to find the problematic block and replace it
# The content in the console looks like â Œ but the actual bytes might be different.
# We'll use a regex that matches the surrounding code and any non-ascii characters in between.

import re

# Match console.error(`[CopyTrading] ... Blitz failed: ${res.error.message}`);
pattern = rb'console\.error\(`\[CopyTrading\].+?Blitz failed: \$\{res\.error\.message\}`\);'
replacement = b'const error_msg = res.error?.message || "Unknown Error"; const error_code = res.error?.code || "UnknownCode"; console.error(`[CopyTrading] \xf0\x9f\x9a\xab Blitz failed for ...${token.slice(-4)}: ${error_code} | ${error_msg}`);'

new_content = re.sub(pattern, replacement, content)

if new_content == content:
    print("No change made. Trying alternative pattern.")
    # Try another pattern just in case
    pattern2 = rb'console\.error\(`\[CopyTrading\].+?Blitz failed'
    # Check if this literal exists
    if b'Blitz failed' in content:
        print("Found 'Blitz failed' in content.")
    else:
        print("'Blitz failed' not found in content.")

with open(file_path, 'wb') as f:
    f.write(new_content)
    print("File updated.")
