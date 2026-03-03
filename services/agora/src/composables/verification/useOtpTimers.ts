import { ref } from "vue";

interface RequestCodeSuccessData {
  codeExpiry: Date;
  nextCodeSoonestTime: Date;
}

export function useOtpTimers() {
  const verificationCode = ref("");
  const verificationNextCodeSeconds = ref(0);
  const verificationCodeExpirySeconds = ref(0);
  let nextCodeTimerId: ReturnType<typeof setTimeout> | undefined = undefined;
  let codeExpiryTimerId: ReturnType<typeof setTimeout> | undefined = undefined;

  function validateAndParseOtpCode(code: string): number | null {
    const trimmedCode = code.trim();

    if (!/^\d{6}$/.test(trimmedCode)) {
      return null;
    }

    const numericCode = parseInt(trimmedCode, 10);

    if (isNaN(numericCode)) {
      return null;
    }

    return numericCode;
  }

  function codeExpired() {
    verificationCodeExpirySeconds.value = 0;
  }

  function resetCode() {
    verificationCode.value = "";
  }

  function processRequestCodeResponse(data: RequestCodeSuccessData) {
    const nowMinusOneSecond = new Date();
    nowMinusOneSecond.setSeconds(nowMinusOneSecond.getSeconds() - 1);

    {
      const nextCodeSoonestTime = data.nextCodeSoonestTime;
      const diff =
        nextCodeSoonestTime.getTime() - nowMinusOneSecond.getTime();
      const nextCodeSecondsWait = Math.ceil(diff / 1000);
      verificationNextCodeSeconds.value = nextCodeSecondsWait;
      decrementNextCodeTimer();
    }

    {
      const codeExpiryTime = data.codeExpiry;
      const diff = codeExpiryTime.getTime() - nowMinusOneSecond.getTime();
      const codeExpirySeconds = Math.ceil(diff / 1000);
      verificationCodeExpirySeconds.value = codeExpirySeconds;
      decrementCodeExpiryTimer();
    }
  }

  function decrementCodeExpiryTimer() {
    clearTimeout(codeExpiryTimerId);
    if (verificationCodeExpirySeconds.value <= 0) {
      verificationCodeExpirySeconds.value = 0;
      return;
    }
    verificationCodeExpirySeconds.value -= 1;
    if (verificationCodeExpirySeconds.value > 0) {
      codeExpiryTimerId = setTimeout(function () {
        decrementCodeExpiryTimer();
      }, 1000);
    }
  }

  function decrementNextCodeTimer() {
    clearTimeout(nextCodeTimerId);
    if (verificationNextCodeSeconds.value <= 0) {
      verificationNextCodeSeconds.value = 0;
      return;
    }
    verificationNextCodeSeconds.value -= 1;
    if (verificationNextCodeSeconds.value > 0) {
      nextCodeTimerId = setTimeout(function () {
        decrementNextCodeTimer();
      }, 1000);
    }
  }

  return {
    verificationCode,
    verificationNextCodeSeconds,
    verificationCodeExpirySeconds,
    validateAndParseOtpCode,
    codeExpired,
    resetCode,
    processRequestCodeResponse,
  };
}
