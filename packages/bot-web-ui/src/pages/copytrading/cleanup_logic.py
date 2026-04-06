
import os

file_path = r'c:\Users\Administrator\newsites\freedonv22026\freedonv22026\packages\bot-web-ui\src\pages\copytrading\CopyTradingLogic.ts'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

new_lines = []
skip_until = -1

for i, line in enumerate(lines):
    if i <= skip_until:
        continue
    
    # Identify the corrupted handleSignal block
    # It starts with 'if (tradeData.contract_id !== this.last_mirrored_contract_id) {'
    # and it appears shortly after a 'private handleSignal' block that is already correctly formatted.
    
    if i > 0 and 'private handleSignal(tradeData: TradeSignal) {' in lines[i-30:i]: # Context check
        if 'if (tradeData.contract_id !== this.last_mirrored_contract_id) {' in line:
            # Found the start of the corrupted block
            # Skip until the matching brace '}' which should be around 7-8 lines down
            j = i
            brace_count = 0
            while j < len(lines):
                brace_count += lines[j].count('{')
                brace_count -= lines[j].count('}')
                if brace_count == -1: # We are looking for the closing brace of the previous block or this one?
                    # Actually, we want to skip until the final '}' of this specific corrupted block.
                    break
                j += 1
            
            # The corrupted block is:
            # if (...) {
            #   ...
            # }
            # } 
            # So it has one extra '}' at the end.
            
            # Let's just skip the next 8 lines as we know the exact structure.
            skip_until = i + 7
            continue

    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Cleanup complete.")
