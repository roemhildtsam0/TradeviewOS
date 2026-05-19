export default function Terms() {
  const section = (title, children) => (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-1)', marginBottom: '0.75rem' }}>{title}</h2>
      <div style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.7 }}>{children}</div>
    </div>
  )

  return (
    <div className="page fade-up" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.04em', color: 'var(--text-1)', marginBottom: 8 }}>
        Terms of Service
      </h1>
      <p style={{ color: 'var(--text-3)', fontSize: '0.84rem', marginBottom: '2.5rem' }}>
        Last updated: May 4, 2026
      </p>

      {section('1. Acceptance of Terms', (
        <p>By accessing or using Stockview ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
      ))}

      {section('2. Description of Service', (
        <p>Stockview provides stock market data, news aggregation, price projections, social community features, and portfolio tracking tools for informational and educational purposes only.</p>
      ))}

      {section('3. Not Financial Advice', (
        <p>All content on Stockview — including price projections, sentiment analysis, community posts, and predictions — is provided for informational purposes only and does not constitute financial, investment, legal, or tax advice. You should consult a qualified financial advisor before making any investment decisions. Past performance is not indicative of future results.</p>
      ))}

      {section('4. User Accounts', (
        <>
          <p>You must be at least 18 years old to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You agree to notify us immediately of any unauthorized use of your account.</p>
        </>
      ))}

      {section('5. User Content', (
        <p>You retain ownership of content you post. By posting, you grant Stockview a non-exclusive, royalty-free license to display and distribute your content on the platform. You agree not to post content that is illegal, harassing, defamatory, or infringes on the rights of others. We reserve the right to remove any content at our discretion.</p>
      ))}

      {section('6. Subscriptions and Payments', (
        <p>Paid subscription plans are billed through Stripe. Subscriptions renew automatically unless cancelled. You may cancel at any time via your Account page. Refunds are provided at our discretion. We reserve the right to change pricing with reasonable notice.</p>
      ))}

      {section('7. Prohibited Conduct', (
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Scraping, crawling, or automated access to the Service</li>
          <li>Attempting to circumvent subscription paywalls</li>
          <li>Posting spam, malware, or phishing content</li>
          <li>Impersonating other users or entities</li>
          <li>Using the Service for market manipulation or illegal trading activity</li>
        </ul>
      ))}

      {section('8. Disclaimer of Warranties', (
        <p>The Service is provided "as is" without warranties of any kind. We do not guarantee the accuracy, completeness, or timeliness of market data or other information. Market data may be delayed.</p>
      ))}

      {section('9. Limitation of Liability', (
        <p>To the maximum extent permitted by law, Stockview and its operators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including any investment losses.</p>
      ))}

      {section('10. Changes to Terms', (
        <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
      ))}

      {section('11. Contact', (
        <p>For questions about these Terms, contact us through the platform.</p>
      ))}
    </div>
  )
}
