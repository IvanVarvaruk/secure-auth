const nodemailer = require('nodemailer');
const config = require('../config');

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
});

async function sendMail(to, subject, html) {
  try {
    await transporter.sendMail({ from: config.smtp.from, to, subject, html });
  } catch (e) {
    console.error('Не вдалося надіслати лист:', e.message);
  }
}

const wrap = (title, body, link, button) => `
  <div style="font-family:system-ui,sans-serif;max-width:480px">
    <h2>${title}</h2><p>${body}</p>
    <p><a href="${link}" style="background:#0f766e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${button}</a></p>
    <p style="color:#666;font-size:13px">Якщо кнопка не працює, скопіюйте посилання:<br>${link}</p>
  </div>`;

const sendActivationEmail = (to, token) => {
  const link = `${config.clientUrl}/activate?token=${token}`;
  const hours = Math.round(config.activationTtlMin / 60);
  return sendMail(to, 'Активація облікового запису', wrap('Підтвердіть пошту', `Посилання дійсне ${hours} год. і працює лише один раз.`, link, 'Активувати акаунт'));
};

const sendResetEmail = (to, token) => {
  const link = `${config.clientUrl}/reset?token=${token}`;
  return sendMail(to, 'Відновлення пароля', wrap('Відновлення пароля', `Посилання дійсне ${config.resetTtlMin} хв. Якщо ви не робили запит — просто ігноруйте цей лист.`, link, 'Встановити новий пароль'));
};

module.exports = { sendActivationEmail, sendResetEmail };
