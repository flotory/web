export interface FaqItem {
  id: string
  question: string
  answer: string
}

export interface FaqSection {
  id: string
  title: string
  items: FaqItem[]
}

export const faqSections: FaqSection[] = [
  {
    id: 'product',
    title: 'Product',
    items: [
      {
        id: 'what-is-flotory',
        question: 'What is Flotory?',
        answer:
          'Flotory is loyalty software for independent cafes, wine bars, bakeries, and similar venues. Guests collect digital stamps in the Flotory mobile app, usually by tapping an NFC stand at your counter. You manage visits, rewards, and branches from a web dashboard.',
      },
      {
        id: 'how-stamps-work',
        question: 'How do guests collect stamps?',
        answer:
          'After joining your venue in the app (often from a QR at the counter), guests tap your NFC stand on return visits. Each tap adds one stamp. When they reach a milestone, the reward unlocks in the app and they show it at the counter to redeem.',
      },
      {
        id: 'need-app',
        question: 'Do guests need to download an app?',
        answer:
          'Yes. Stamps, progress, and reward redemption happen in the Flotory mobile app for iOS and Android. Your venue can share a QR or link so new guests install the app and join your card in a few taps.',
      },
      {
        id: 'pos-required',
        question: 'Do I need a POS integration?',
        answer:
          'No. Flotory does not connect to your till or POS. Stamps are collected with NFC at the counter; staff confirm reward redemptions in the app. That keeps setup simple and works for venues without integrated systems.',
      },
    ],
  },
  {
    id: 'owners',
    title: 'For venue owners',
    items: [
      {
        id: 'onboarding',
        question: 'How do I get started?',
        answer:
          'Flotory is sales-led today. Book a demo walkthrough, then our team helps you configure your venue, rewards, and NFC hardware. Typical launch is 1–3 business days after onboarding.',
      },
      {
        id: 'multi-location',
        question: 'Can I run multiple locations?',
        answer:
          'Yes. Each branch is its own venue in Flotory with its own stamp card, rewards, and NFC tags. Owners switch between venues in the dashboard or manage them from a single account.',
      },
      {
        id: 'campaigns',
        question: 'Can I run promotions like double stamps?',
        answer:
          'Yes. Campaign templates (for example happy hour, VIP, or bring-back offers) can multiply stamps or target specific guest segments. You configure them in the owner dashboard.',
      },
      {
        id: 'staff-scanner',
        question: 'Does staff need to scan guest phones?',
        answer:
          'No scanner app for everyday stamps. Guests tap NFC themselves. Staff only need to recognise an unlocked reward when a guest shows it on their phone.',
      },
    ],
  },
  {
    id: 'support',
    title: 'Account & support',
    items: [
      {
        id: 'customer-web-login',
        question: 'Can loyalty guests log in on the website?',
        answer:
          'Guest loyalty lives in the mobile app. The flotory.com website is for venue owners and platform admins. If you are a guest looking for your stamp card, open the Flotory app or visit your venue’s join link.',
      },
      {
        id: 'pricing',
        question: 'How much does Flotory cost?',
        answer:
          'Start with 1 month free on your owner account. After that, 9,900 AMD per month for your first location and 4,900 AMD per month for each additional branch — one flat rate that includes the guest app loop, NFC stamp stands, owner dashboard, campaigns, and onboarding support. Guests use the app for free. See the pricing page for details.',
      },
      {
        id: 'help',
        question: 'Where can I get help?',
        answer:
          'Use the contact form on this site, book a demo for onboarding questions, or email our support inbox. We aim to reply within one business day.',
      },
    ],
  },
]

export const faqItems = faqSections.flatMap((section) => section.items)
