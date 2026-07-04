const LOG_WEBHOOK_URL = 'https://discord.com/api/webhooks/1523045018464551122/CTGHA2es7TKCPGiyaWbdgzjAimmWB6PWkUyKeXKg7BSM1Z9Rsl4tf4l763dP-r4I73sv';

export interface LogData {
  toolName: string;
  studentName?: string;
  domain?: string;
  status: 'started' | 'success' | 'failed';
  errorMessage?: string;
  details?: Record<string, string | number | undefined>;
}

export async function logToDiscord(data: LogData) {
  try {
    const isError = data.status === 'failed';
    const title = isError ? '❌ Tool Generation Failed' : data.status === 'success' ? '✅ Tool Generation Succeeded' : '⏳ Tool Generation Started';
    const color = isError ? 15548997 : data.status === 'success' ? 3066993 : 3447003; // Red, green, blue

    const fields = [
      { name: '🛠️ Tool', value: `\`${data.toolName}\``, inline: true },
      { name: '👤 Student', value: `\`${data.studentName || 'Anonymous'}\``, inline: true },
      { name: '🌐 Domain', value: `\`${data.domain || 'N/A'}\``, inline: true }
    ];

    if (data.errorMessage) {
      fields.push({ name: '⚠️ Error Message', value: `\`\`\`\n${data.errorMessage}\n\`\`\``, inline: false });
    }

    if (data.details) {
      const detailsText = Object.entries(data.details)
        .map(([k, v]) => `• **${k}:** \`${v ?? 'N/A'}\``)
        .join('\n');
      if (detailsText) {
        fields.push({ name: '📋 Parameters', value: detailsText, inline: false });
      }
    }

    const payload = {
      embeds: [
        {
          title,
          color,
          fields,
          timestamp: new Date().toISOString()
        }
      ]
    };

    await fetch(LOG_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Failed to send log to Discord:', error);
  }
}
