import React, { useState } from 'react';
import { Button } from '@unbrn/ui/Button';
import { Textarea } from '@unbrn/ui/Textarea';
import { THEME_COLOR } from '../../theme';

interface FeedbackFormProps {
  toolName: string;
  studentName?: string;
  domain?: string;
}

export function FeedbackForm({ toolName, studentName, domain }: FeedbackFormProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const emojiRatings = ['😔', '😐', '🙂', '😊', '🤩'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() && rating === null) return;

    setIsSubmitting(true);
    try {
      const payload = {
        embeds: [
          {
            title: '📑 NEW MESSAGE FOR CREATOR',
            color: parseInt(THEME_COLOR.replace('#', ''), 16) || 3134496,
            description: `**Message:**\n>>> ${feedbackText.trim() || 'No message text provided.'}`,
            fields: [
              { name: '👤 Student', value: `\`${studentName || 'Anonymous'}\``, inline: true },
              { name: '🛠️ Tool', value: `\`${toolName || 'Unknown'}\``, inline: true },
              { name: '🌐 Domain', value: `\`${domain || 'N/A'}\``, inline: true },
              { name: '⚡ Rating', value: `\`${rating ? `${emojiRatings[rating - 1]} (${rating}/5)` : 'Not Rated'}\``, inline: true }
            ]
          }
        ]
      };

      await fetch('https://discord.com/api/webhooks/1523038467469213858/wAComwufNepMprJbhxQdz9bDrkg_-2AtqlJzEhWOnFKSqvZXUJSZEEArguaTaVQTOvS4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setIsSubmitted(true);
    } catch (error) {
      console.error('Failed to send feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="feedback-success-state">
        <p>Message sent, now go back to doing nothing.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="feedback-form-container">
      <div className="pfc-divider" style={{ margin: '1.25rem 0' }} />
      <h4 className="feedback-title">Leave message for creator</h4>

      <div className="feedback-stars">
        {emojiRatings.map((emoji, index) => {
          const score = index + 1;
          const isActive = rating === score;
          return (
            <button
              key={score}
              type="button"
              onClick={() => setRating(score)}
              className={`feedback-star-btn ${isActive ? 'active' : ''}`}
              style={{ opacity: rating === null || isActive ? 1 : 0.35, fontSize: '1.75rem' }}
            >
              {emoji}
            </button>
          );
        })}
      </div>

      <Textarea
        variant="outlined"
        value={feedbackText}
        onChange={(e: any) => setFeedbackText(e.target.value)}
        placeholder="Be sweet, savage, or just tell the creator how much time you saved..."
        fullWidth
      />

      <Button
        type="submit"
        variant="outlined"
        size={2}
        fullWidth
        disabled={isSubmitting || (!feedbackText.trim() && rating === null)}
      >
        {isSubmitting ? 'Sending message...' : 'Send message'}
      </Button>
    </form>
  );
}
