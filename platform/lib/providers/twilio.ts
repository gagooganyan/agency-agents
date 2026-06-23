const BASE = 'https://api.twilio.com/2010-04-01'

function authHeader(): string {
  const sid = process.env.TWILIO_ACCOUNT_SID!
  const token = process.env.TWILIO_AUTH_TOKEN!
  return 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')
}

export interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  isoCountry: string
  locality: string | null
  region: string | null
  monthlyFee: number
}

interface TwilioAvailableNumber {
  phone_number: string
  friendly_name: string
  iso_country: string
  locality?: string | null
  region?: string | null
}

interface TwilioAvailableResponse {
  available_phone_numbers: TwilioAvailableNumber[]
}

interface TwilioPurchasedNumber {
  sid: string
  phone_number: string
}

export async function searchNumbers(isoCountry: string, areaCode?: string): Promise<AvailableNumber[]> {
  const sid = process.env.TWILIO_ACCOUNT_SID!
  let url = `${BASE}/Accounts/${sid}/AvailablePhoneNumbers/${isoCountry}/Local.json?SmsEnabled=true&VoiceEnabled=true&Limit=20`
  if (areaCode) url += `&AreaCode=${areaCode}`
  const res = await fetch(url, { headers: { Authorization: authHeader() } })
  if (!res.ok) throw new Error(`Twilio search failed: ${await res.text()}`)
  const json = await res.json() as TwilioAvailableResponse
  return (json.available_phone_numbers ?? []).map(n => ({
    phoneNumber: n.phone_number,
    friendlyName: n.friendly_name,
    isoCountry,
    locality: n.locality ?? null,
    region: n.region ?? null,
    monthlyFee: 700,
  }))
}

export async function purchaseNumber(phoneNumber: string): Promise<{ sid: string; number: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID!
  const res = await fetch(`${BASE}/Accounts/${sid}/IncomingPhoneNumbers.json`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ PhoneNumber: phoneNumber }),
  })
  if (!res.ok) throw new Error(`Twilio purchase failed: ${await res.text()}`)
  const json = await res.json() as TwilioPurchasedNumber
  return { sid: json.sid, number: json.phone_number }
}

export async function releaseNumber(twilioSid: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!
  const res = await fetch(`${BASE}/Accounts/${sid}/IncomingPhoneNumbers/${twilioSid}.json`, {
    method: 'DELETE',
    headers: { Authorization: authHeader() },
  })
  if (!res.ok && res.status !== 204) throw new Error(`Twilio release failed: ${await res.text()}`)
}
