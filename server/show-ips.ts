import fs from 'fs';
import path from 'path';

const IP_LIMITS_FILE = path.join(process.cwd(), 'server', 'ip_limits.json');

function main() {
  if (!fs.existsSync(IP_LIMITS_FILE)) {
    console.log('\n❌ No stored IP rate limits found.');
    console.log('The database file server/ip_limits.json does not exist yet (it is created upon the first request).\n');
    return;
  }

  try {
    const content = fs.readFileSync(IP_LIMITS_FILE, 'utf-8');
    const data = JSON.parse(content);
    const now = Date.now();

    console.log('\n=================== STORED IP RATE LIMITS ===================');
    console.log(`Current Server Time : ${new Date().toLocaleString()}`);
    console.log('------------------------------------------------------------');

    const ips = Object.keys(data);
    if (ips.length === 0) {
      console.log('No IPs stored in cache.');
      return;
    }

    let activeCount = 0;
    for (const ip of ips) {
      const record = data[ip];
      const expired = now > record.resetTime;
      const timeLeftMs = record.resetTime - now;
      const timeLeftMin = Math.round(timeLeftMs / 1000 / 60);

      if (!expired) {
        activeCount++;
        console.log(`🟢 IP: ${ip}`);
        console.log(`   Requests: ${record.count} / 3`);
        console.log(`   Resets in: ${timeLeftMin} minutes (${new Date(record.resetTime).toLocaleString()})`);
      } else {
        console.log(`🔴 IP: ${ip} (EXPIRED)`);
        console.log(`   Requests: ${record.count} / 3`);
        console.log(`   Reset at: ${new Date(record.resetTime).toLocaleString()}`);
      }
      console.log('------------------------------------------------------------');
    }

    console.log(`📊 Summary: ${ips.length} total IPs cached (${activeCount} active, ${ips.length - activeCount} expired)\n`);
  } catch (error) {
    console.error('❌ Failed to parse server/ip_limits.json:', error);
  }
}

main();
