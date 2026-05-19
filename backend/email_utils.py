import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "") or SMTP_USER
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def _send(to: str, subject: str, html: str) -> None:
    """Send email; silently no-ops if SMTP credentials are not configured."""
    if not SMTP_USER or not SMTP_PASSWORD:
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(EMAIL_FROM, to, msg.as_string())
    except Exception:
        pass  # fail open — email is best-effort


def send_password_reset(to: str, token: str) -> None:
    url = f"{FRONTEND_URL}/reset-password?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#00c805">Reset your Stockview password</h2>
      <p>Click the link below to set a new password. This link expires in 1 hour.</p>
      <p><a href="{url}" style="color:#00c805">{url}</a></p>
      <p style="color:#888;font-size:0.85em">If you didn't request this, you can safely ignore this email.</p>
    </div>
    """
    _send(to, "Reset your Stockview password", html)


def send_email_verification(to: str, username: str, token: str) -> None:
    url = f"{FRONTEND_URL}/verify-email?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#00c805">Welcome to Stockview, {username}!</h2>
      <p>Please verify your email address to unlock all features.</p>
      <p><a href="{url}" style="color:#00c805">Verify my email</a></p>
    </div>
    """
    _send(to, "Verify your Stockview email", html)


def send_price_alert(to: str, ticker: str, condition: str, target: float, current: float) -> None:
    direction = "above" if condition == "above" else "below"
    url = f"{FRONTEND_URL}/stock/{ticker}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#00c805">Price Alert: {ticker}</h2>
      <p><strong>{ticker}</strong> is now {direction} your target of <strong>${target:.2f}</strong>.</p>
      <p>Current price: <strong>${current:.2f}</strong></p>
      <p><a href="{url}" style="color:#00c805">View {ticker} on Stockview →</a></p>
    </div>
    """
    _send(to, f"Price Alert: {ticker} hit ${target:.2f}", html)
