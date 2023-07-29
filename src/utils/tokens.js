const {
  RtcTokenBuilder,
  RtmTokenBuilder,
  RtcRole,
  RtmRole,
} = require("agora-access-token");

const appID = process.env.AGORA_APP_ID;
const appCertificate = process.env.AGORA_PRIMARY_CERTIFICATE;
const role = RtcRole.PUBLISHER;

const expirationTimeInSeconds = 72000;
const currentTimeStamp = Math.floor(Date.now() / 1000);

const priviligedExpiredTs = currentTimeStamp + expirationTimeInSeconds;

const generateAgoraRtcToken = (channelName, uid) => {
  const token = RtcTokenBuilder.buildTokenWithAccount(
    appID,
    appCertificate,
    channelName,
    uid,
    role,
    priviligedExpiredTs
  );
  return { priviligedExpiredTs, token };
};

module.exports = { generateAgoraRtcToken };
