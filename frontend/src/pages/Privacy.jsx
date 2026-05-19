export default function Privacy() {
  const section = (title, children) => (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-1)', marginBottom: '0.75rem' }}>{title}</h2>
      <div style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.7 }}>{children}</div>
    </div>
  )

  return (
    <div className="page fade-up" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.04em', color: 'var(--text-1)', marginBottom: 8 }}>
        Privacy Policy
      </h1>
      <p style={{ color: 'var(--text-3)', fontSize: '0.84rem', marginBottom: '2.5rem' }}>
        Last updated: May 4, 2026
      </p>

      {section('1. Information We Collect', (
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li><strong>Account data:</strong> email address, username, and hashed password when you register.</li>
          <li><strong>Usage data:</strong> pages visited, features used, and community posts/predictions you create.</li>
          <li><strong>Payment data:</strong> billing is handled entirely by Stripe; we do not store your card details.</li>
          <li><strong>Images:</strong> chart screenshots you upload to accompany predictions.</li>
        </ul>
      ))}

      {section('2. How We Use Your Information', (
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>To operate and improve the Service</li>
          <li>To send transactional emails (account verification, password resets, price alerts)</li>
          <li>To manage your subscription via Stripe</li>
          <li>To display your public username and posts in the community feed</li>
        </ul>
      ))}

      {section('3. Data Sharing', (
        <p>We do not sell your personal data. We share data only with service providers necessary to operate Stockview (Stripe for payments, your SMTP provider for email). We may disclose data if required by law.</p>
      ))}

      {section('4. Cookies and Local Storage', (
        <p>We use browser local storage to keep you signed in (storing your authentication token). We do not use third-party tracking cookies.</p>
      ))}

      {section('5. Data Retention', (
        <p>We retain your account data for as long as your account is active. You may request deletion of your account and associated data by contacting us through the platform.</p>
      ))}

      {section('6. Security', (
        <p>Passwords are hashed using bcrypt. Authentication tokens are signed JWTs. We use HTTPS in production. While we take reasonable precautions, no system is perfectly secure.</p>
      ))}

      {section('7. Your Rights', (
        <p>Depending on your jurisdiction, you may have the right to access, correct, or delete your personal data. Contact us through the platform to exercise these rights.</p>
      ))}

      {section('8. Children', (
        <p>Stockview is not intended for users under 18. We do not knowingly collect data from minors.</p>
      ))}

      {section('9. Changes to This Policy', (
        <p>We may update this Privacy Policy. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>
      ))}

      {section('10. Contact', (
        <p>For privacy-related questions, contact us through the platform.</p>
      ))}
    </div>
  )
}
