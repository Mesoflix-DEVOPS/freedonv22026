
import os

file_path = r'c:\Users\Administrator\newsites\freedonv22026\freedonv22026\packages\bot-web-ui\src\pages\copytrading\CopyTradingLogic.ts'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

new_lines = []
skip_until = -1

for i, line in enumerate(lines):
    if i <= skip_until:
        continue
    
    # Handshake replacement
    if 'globalObserver.register(\'api.buy_received\'' in line:
        new_lines.append(line)
        # Search for the if block inside
        j = i + 1
        while j < len(lines) and 'if (this.proactive_req_ids.has(req_id))' not in lines[j]:
            new_lines.append(lines[j])
            j += 1
        
        if j < len(lines):
            # Found the if block
            new_lines.append("                    if (this.proactive_req_ids.has(req_id) || this.processed_master_ids.has(req_id)) {\n")
            new_lines.append("                        console.log(`[NetworkSync] Handshake: Linked Req ${req_id} -> CID ${contract_id}`);\n")
            new_lines.append("                        this.blitized_master_contract_ids.add(contract_id);\n")
            new_lines.append("                        this.processed_master_ids.add(contract_id);\n")
            new_lines.append("                        \n")
            new_lines.append("                        // Cleanup after 2 minutes\n")
            new_lines.append("                        setTimeout(() => {\n")
            new_lines.append("                            this.blitized_master_contract_ids.delete(contract_id);\n")
            new_lines.append("                            this.processed_master_ids.delete(contract_id);\n")
            new_lines.append("                        }, 120000);\n")
            new_lines.append("                    }\n")
            
            # Skip until the end of the original if block (which is about 5 lines)
            k = j + 1
            while k < len(lines) and '}' not in lines[k]:
                k += 1
            skip_until = k
        continue

    # handleSignal replacement
    if 'private handleSignal(tradeData: TradeSignal)' in line:
        new_lines.append("    private handleSignal(tradeData: TradeSignal) {\n")
        new_lines.append("        const master_id = tradeData.contract_id;\n")
        new_lines.append("        \n")
        new_lines.append("        if (!master_id) {\n")
        new_lines.append("            console.warn('[NetworkSync] Signal missing contract_id, using temporal fallback');\n")
        new_lines.append("            this.executeTargetTrades(tradeData);\n")
        new_lines.append("            return;\n")
        new_lines.append("        }\n")
        new_lines.append("\n")
        new_lines.append("        if (this.processed_master_ids.has(master_id)) {\n")
        new_lines.append("            console.log(`[NetworkSync] Skipping duplicate signal for Master CID ${master_id}`);\n")
        new_lines.append("            return;\n")
        new_lines.append("        }\n")
        new_lines.append("\n")
        new_lines.append("        console.log(`[NetworkSync] Processing Signal for CID: ${master_id}`);\n")
        new_lines.append("        this.processed_master_ids.add(master_id);\n")
        new_lines.append("        \n")
        new_lines.append("        // CID Cooldown: Clear after 1 minute\n")
        new_lines.append("        setTimeout(() => this.processed_master_ids.delete(master_id), 60000);\n")
        new_lines.append("        \n")
        new_lines.append("        this.executeTargetTrades(tradeData);\n")
        new_lines.append("    }\n")
        
        # Skip original handleSignal body
        k = i + 1
        while k < len(lines) and '}' not in lines[k]:
            k += 1
        skip_until = k
        continue

    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Replacement complete.")
