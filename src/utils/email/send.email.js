 
import nodemailer from "nodemailer"


export async function sendEmail({
    from = process.env.APP_EMAIL,
    to = "ahmedzendia@gmail.com",
    cc = "",
    bcc = "",
    text = "",
    html = "",
    subject = "sarahaApp",
    attachments = [] } = {}) {
    
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.APP_EMAIL,
    pass: process.env.APP_PASS,
  },
});
     const info = await transporter.sendMail({
    from: `"team up " <${process.env.APP_EMAIL}> `,
    to,
    cc,
    subject,
    text,
      html,
      attachments
  });

  console.log(info.messageId);
    
}


 
