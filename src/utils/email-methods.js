const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendFeedbackMail = async (text, username) => {
  const msg = {
    to: "fluxroom.main@gmail.com",
    from: "fluxroom.main@gmail.com",
    subject: `${username}: I am not happy`,
    text,
    html: `<strong>${text}</strong>`,
  };

  // const msg2 = {
  //   to: "surajmishra.jeeadv@gmail.com",
  //   from: "suraj@fluxroomapp.com",
  //   subject: `${username}: I am not happy`,
  //   text,
  //   html: `<strong>${text}</strong>`,
  // };

  await sgMail.send(msg);
  // await sgMail.send(msg2);

  return { message: "Emails sent" };
};

module.exports = { sendFeedbackMail };
