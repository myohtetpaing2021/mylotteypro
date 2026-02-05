export const Logic = {
    // --- 2D Logic (Full Port from 2DCalcPro.js) ---
    calculate2D(inputText) {
        const DATA_SETS = {
            'ပါဝါ': 10, 'Power': 10,
            'နက္ခတ်': 10, 'NatKhat': 10,
            'ညီအစ်ကို': 20, 'Brother': 20,
            'အပူး': 10, 'စုံပူး': 5, 'မပူး': 5,
            'ပဒေသာ': 32
        };

        function parseAmount(str) {
            if (!str) return 0;
            return parseInt(str.replace(/,/g, ''));
        }

        function formatMoney(num) {
            return new Intl.NumberFormat('en-US').format(num);
        }

        const lines = inputText.split(/\n/);
        let grandTotal = 0;
        let validLineCount = 0;
        let outputText = "<b>🎰 2D Pro Calculator Results</b>\n\n";

        lines.forEach((line) => {
            line = line.trim();
            if (!line) return;

            let cleanLine = line.split(/T\s*=/i)[0].trim();
            let result = null;

            try {
                // 1. DATA_SETS (Power, NatKhat, etc.)
                for (const [key, count] of Object.entries(DATA_SETS)) {
                    const regex = new RegExp(`(${key})\s*[-]?\s*([\d,]+)`, 'i');
                    const match = cleanLine.match(regex);
                    if (match) {
                        const amount = parseAmount(match[2]);
                        result = { description: key, calculation: `${count} x ${amount}`, totalAmt: count * amount };
                        break;
                    }
                }

                if (!result) {
                    // 2. Brake (B) e.g., 2/7/4 B - 100
                    let match = cleanLine.match(/([\d\/\.\,\s]+)\s*(B|b|ဘရိတ်)\s*[-]?\s*([\d,]+)/);
                    if (match) {
                        const brakes = match[1].split(/[\/\.\,\s]/).filter(s => s.trim() !== '');
                        const amount = parseAmount(match[3]);
                        result = { description: `${match[1]} Brake`, calculation: `${brakes.length * 10} x ${amount}`, totalAmt: (brakes.length * 10) * amount };
                    }
                }

                if (!result) {
                    // 3. Round (P) e.g., 1 P - 100 or 1 ပတ် 100
                    let match = cleanLine.match(/(\d)\s*(P|p|ပတ်)\s*[-]?\s*([\d,]+)/);
                    if (match) {
                        const amount = parseAmount(match[3]);
                        result = { description: `${match[1]} Round`, calculation: `19 x ${amount}`, totalAmt: 19 * amount };
                    }
                }

                if (!result) {
                    // 4. Head/Tail (ထိပ်/နောက်)
                    let match = cleanLine.match(/(\d)\s*(ထိပ်|နောက်|Head|Tail)\s*[-]?\s*([\d,]+)/i);
                    if (match) {
                        const type = (match[2] === 'ထိပ်' || match[2].toLowerCase() === 'head') ? 'Head' : 'Tail';
                        const amount = parseAmount(match[3]);
                        result = { description: `${match[1]} ${type}`, calculation: `10 x ${amount}`, totalAmt: 10 * amount };
                    }
                }

                if (!result) {
                    // 5. Khway (ခွေ) e.g., 01234 အပူးခွေ - 100
                    let match = cleanLine.match(/(\d+)\s*(အပူး)?(ခွေ|Khway)\s*[-]?\s*([\d,]+)/i);
                    if (match) {
                        const amount = parseAmount(match[4]);
                        const count = match[1].length * match[1].length; // Logic: Length * Length
                        result = { description: `${match[1]} Khway`, calculation: `${count} x ${amount}`, totalAmt: count * amount };
                    }
                }

                if (!result) {
                     // 7. Direct/Reverse with Amount (e.g. 25 - 1000R500)
                    let match = cleanLine.match(/(\d{2})\s*[-]\s*([\d,]+)[R]([\d,]+)/i);
                    if (match) {
                        let t = parseAmount(match[2]);
                        let d = match[1];
                        let c = parseAmount(match[2]);
                        let rAmt = parseAmount(match[3]);
                        if (match[1][0] !== match[1][1]) {
                            t += rAmt;
                            d += ' + R';
                            c += ` + ${rAmt}`;
                        }
                        result = { description: d, calculation: c, totalAmt: t };
                    }
                }

                if (!result) {
                    // 8. Direct List (Standard) e.g. 12 34 56 - 100
                    let match = cleanLine.match(/([\d\/\.\,\s]+)\s*[-]\s*([\d,]+)$/);
                    if (match) {
                        const nums = match[1].split(/[\/\.\,\s]/).filter(n => n.trim().length === 2);
                        const amount = parseAmount(match[2]);
                        if (nums.length > 0) {
                            result = { description: nums.join(', '), calculation: `${nums.length} x ${amount}`, totalAmt: nums.length * amount };
                        }
                    }
                }

            } catch (e) { console.error(e); }

            if (result) {
                grandTotal += result.totalAmt;
                validLineCount++;
                outputText += `✅ <b>${result.description}</b>\n   └ <code>${result.calculation}</code> = ${formatMoney(result.totalAmt)}\n`;
            }
        });

        if (validLineCount === 0) return "⚠️ တွက်ချက်လို့ရတဲ့ စာရင်းမတွေ့ပါ။";

        outputText += `\n--------------------------------\n`;
        outputText += `📋 Items: <b>${validLineCount}</b>\n`;
        outputText += `💰 <b>TOTAL: ${formatMoney(grandTotal)} Ks</b>`;
        return outputText;
    },

    // --- 3D Logic (Full Port from 3DCalcPro.js) ---
    calculate3D(rawText) {
        const lines = rawText.split(/\n/);
        let totalAmount = 0;
        let breakdown = [];
        
        // Permutation Helper
        const permCache = {};
        function getPermutations(numStr) {
            if(permCache[numStr]) return permCache[numStr];
            let results = [];
            if (numStr.length === 2) {
                let rev = numStr[1] + numStr[0];
                results.push(numStr);
                if (numStr[0] !== numStr[1]) results.push(rev);
            } else if (numStr.length === 3) {
                let digits = numStr.split('');
                let uniquePerms = new Set();
                function permute(arr, m = []) {
                    if (arr.length === 0) uniquePerms.add(m.join(''));
                    else {
                        for (let i = 0; i < arr.length; i++) {
                            let curr = arr.slice();
                            let next = curr.splice(i, 1);
                            permute(curr.slice(), m.concat(next));
                        }
                    }
                }
                permute(digits);
                results = Array.from(uniquePerms);
            }
            permCache[numStr] = results;
            return results;
        }

        for(let i=0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;
            if (line.toLowerCase().startsWith('t=') || line.toLowerCase().startsWith('total')) continue;

            let normalized = line.replace(/\s+/g, ' '); 
            let parts, numbersPart = "", amountPart = "";
            
            if (normalized.includes('-')) {
                parts = normalized.split('-');
            } else if (normalized.includes(' R ')) {
                let rIndex = normalized.indexOf(' R ');
                parts = [normalized.substring(0, rIndex), "R " + normalized.substring(rIndex + 3)];
            } else {
                parts = [normalized];
            }

            numbersPart = parts[0] ? parts[0].trim() : "";
            amountPart = parts[1] ? parts[1].trim() : "";

            if (!amountPart && numbersPart.toUpperCase().includes('R')) {
                let match = numbersPart.match(/^([\d\s]+)\s(R|r)\s*(\d+)$/);
                if (match) {
                    numbersPart = match[1];
                    amountPart = 'R ' + match[3];
                }
            }

            if (!numbersPart || !amountPart) continue;

            let numbers = numbersPart.match(/\d{2,3}/g);
            if (!numbers) continue;

            let directAmt = 0, rAmt = 0;
            let cleanAmount = amountPart.replace(/T=.*$/i, '').replace(/Total.*$/i, '').trim();

            if (cleanAmount.toUpperCase().includes('R')) {
                let amtParts = cleanAmount.toUpperCase().split('R');
                let left = amtParts[0].trim();
                let right = amtParts[1].trim();
                if (left) directAmt = parseInt(left) || 0;
                if (right) rAmt = parseInt(right) || 0;
            } else {
                directAmt = parseInt(cleanAmount.replace(/[^\d]/g, '')) || 0;
            }

            for(let j=0; j < numbers.length; j++) {
                let num = numbers[j];
                if (directAmt > 0) {
                    totalAmount += directAmt;
                    breakdown.push({ num: num, amount: directAmt, type: 'Direct' });
                }

                if (rAmt > 0) {
                    let perms = getPermutations(num);
                    let permsToBet = (directAmt > 0) ? perms.filter(p => p !== num) : perms;
                    
                    permsToBet.forEach(p => {
                        totalAmount += rAmt;
                        breakdown.push({ num: p, amount: rAmt, type: 'R (' + num + ')' });
                    });
                }
            }
        }

        // Formatting
        let responseText = `<b>🧮 3D Calculator Result</b>\n\n`;
        responseText += `<pre>`;
        responseText += `Num   |   Amount | Type\n`;
        responseText += `------|----------|------\n`;
        
        // Show only first 25 items to prevent text overflow
        const itemsToShow = breakdown.slice(0, 25);
        itemsToShow.forEach(item => {
            const num = item.num.padEnd(5, ' ');
            const amt = item.amount.toLocaleString().padStart(8, ' ');
            const type = item.type === 'Direct' ? 'Dir' : 'R';
            responseText += `${num} | ${amt} | ${type}\n`;
        });
        
        responseText += `</pre>`;
        if (breakdown.length > 25) responseText += `<i>... and ${breakdown.length - 25} more items</i>\n`;
        
        responseText += `\n══════════════════\n`;
        responseText += `<b>Grand Total: ${totalAmount.toLocaleString()} MMK</b>\n`;
        responseText += `Items Count: ${breakdown.length}`;
        
        return responseText;
    },

    // --- Report Logic (Full Port from ThaiLotteryCalc.js) ---
    calculateReport(inputText, commissionRate = 13) {
        const lines = inputText.split(/\r?\n/);
        let bets = new Array(10).fill(0);
        let ps = new Array(10).fill(0);
        const RATIO = 80;
        let hasData = false;

        lines.forEach((line) => {
            line = line.trim();
            if (!line) return;
            // Matches: 1. 1000 P.100 or 1.1000 P.100
            const match = line.match(/^(\d+)\.\s*(\d+)\s*(.*)$/);

            if (match) {
                const index = parseInt(match[1]) - 1;
                const bet = parseFloat(match[2]) || 0;
                let p = 0;
                const rest = match[3].toLowerCase();
                
                if (rest.includes('p')) {
                    const pMatch = rest.match(/p\.?\s*(\d+)/);
                    if (pMatch) p = parseFloat(pMatch[1]) || 0;
                }
                
                if (index >= 0 && index < 10) {
                    bets[index] = bet;
                    ps[index] = p;
                    hasData = true;
                }
            }
        });

        if (!hasData) return "⚠️ Data format incorrect. Use: 1. 1000 P.100";

        let totalBet = bets.reduce((a, b) => a + b, 0);
        let totalP = ps.reduce((a, b) => a + b, 0);
        const net = totalBet - (totalBet * (commissionRate / 100));
        const payout = totalP * RATIO;
        const profit = net - payout;
        
        function format(n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
        const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Yangon" });

        let report = `<b>📊 LOTTERY REPORT</b>\n`;
        report += `📅 ${now}\n`;
        report += `--------------------------------\n`;
        report += `<b>💰 Total Bet:</b> ${format(totalBet)}\n`;
        report += `<b>🅿️ Total P:</b> ${format(totalP)}\n`;
        report += `<b>📉 Net (${commissionRate}%):</b> ${format(Math.round(net))}\n`;
        report += `<b>💸 Payout (x${RATIO}):</b> ${format(Math.round(payout))}\n`;
        report += `--------------------------------\n\n`;
        
        if (profit >= 0) {
            report += `<b>✅ PROFIT: +${format(Math.round(profit))} Ks</b>\n`;
        } else {
            report += `<b>❌ LOSS: ${format(Math.round(profit))} Ks</b>\n`;
        }
        return report;
    }
};
