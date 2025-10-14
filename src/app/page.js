"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const stats = [
  { value: "12k+", label: "Monthly connections" },
  { value: "84%", label: "Return weekly" },
  { value: "42", label: "Cities covered" },
  { value: "48h", label: "Avg. time-to-first event" },
];

const features = [
  {
    title: "Activities Near Me",
    description: "GPS-tailored suggestions with real-world RSVPs, pricing, and host info so newcomers can say yes faster.",
    icon: "📍",
  },
  {
    title: "AI Brainstorm Studio",
    description: "Turn prompts into event ideas, rally community endorsements, and auto-launch high-signal experiences.",
    icon: "💡",
  },
  {
    title: "Community Groups",
    description: "Persistent spaces with notices, polls, and shared cadences that empower admins to keep communities aligned.",
    icon: "🤝",
  },
];

const testimonials = [
  {
    quote:
      "We piloted WizFriends for our relocation program—86% of participants built a new friendship within two weeks.",
    name: "Zara Patel",
    role: "Global Mobility Lead, NimbleTech",
    avatar: "/pics/5.jpg",
  },
  {
    quote:
      "Our city partners love the verified hosts and impact reporting. It’s a meaningful bridge between newcomers and locals.",
    name: "Michael Roux",
    role: "Director of Community Strategy, CapeWorks",
    avatar: "/pics/7.jpg",
  },
];

export default function LandingPage() {
  return (
    <main className="bg-white text-gray-900">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-transparent to-pink-100" />
          <Image
            src="/pics/3.jpg"
            alt="Community gathering"
            fill
            sizes="100vw"
            className="object-cover opacity-20"
            priority
          />
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-36 pb-24">
          <div className="max-w-3xl space-y-8">
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-white/70 backdrop-blur px-4 py-2 rounded-full text-sm font-semibold text-indigo-600 border border-indigo-100"
            >
              WizFriends v1.0 · Built for belonging
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-3xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight text-gray-900"
            >
              Launch the community layer your people have been waiting for.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-base sm:text-lg md:text-xl text-gray-600"
            >
              WizFriends helps global teams, campus programs, and city partners turn strangers into recurring groups.
              AI-curated activities, endorsement workflows, and verified hosts—all in one modern web app experience.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <Link
                href="/app"
                className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all text-lg"
              >
                Launch the app
              </Link>
              <Link
                href="#product"
                className="inline-flex items-center justify-center text-indigo-600 font-semibold px-8 py-3 rounded-full border border-indigo-200 hover:border-indigo-400 transition-all text-lg"
              >
                View capabilities
              </Link>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-10">
              {stats.map((item) => (
                <div key={item.label} className="bg-white/70 backdrop-blur border border-white/80 rounded-3xl p-4 text-center shadow-md">
                  <p className="text-2xl font-bold text-indigo-600">{item.value}</p>
                  <p className="text-xs uppercase tracking-widest text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Product Overview */}
      <section id="product" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 grid md:grid-cols-[1.2fr,0.8fr] gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              Everything you need to run real-world community programs.
            </h2>
            <p className="text-gray-600 text-base sm:text-lg">
              WizFriends is purpose-built for social discovery. We orchestrate event discovery, communal ideation,
              and group continuity so you can focus on storytelling and safety.
            </p>
            <div className="space-y-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex gap-4 bg-indigo-50/60 border border-indigo-100 rounded-3xl p-5"
                >
                  <div className="text-3xl">{feature.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <Link
                href="/app?tab=brainstorm"
                className="text-sm font-semibold text-indigo-600 hover:text-pink-500 transition"
              >
                Demo the Brainstorm flow →
              </Link>
              <Link
                href="/app?tab=groups"
                className="text-sm font-semibold text-indigo-600 hover:text-pink-500 transition"
              >
                See groups in action →
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-200 via-white to-pink-200 rounded-3xl blur-2xl opacity-40" />
            <div className="relative bg-white rounded-3xl shadow-2xl border border-white overflow-hidden">
              <Image
                src="/pics/4.jpg"
                alt="WizFriends product preview"
                width={900}
                height={600}
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gradient-to-b from-white to-indigo-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
            <div className="max-w-xl space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Teams trust WizFriends with belonging.</h2>
              <p className="text-gray-600 text-base sm:text-lg">
                From global mobility programs to university welcome centres, WizFriends keeps communities lively and accountable.
              </p>
            </div>
            <Link
              href="/app"
              className="inline-flex items-center justify-center bg-indigo-600 text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition"
            >
              Explore the platform
            </Link>
          </div>
          <div className="mt-12 grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="rounded-3xl bg-white shadow-xl border border-indigo-100 p-8 space-y-6"
              >
                <p className="text-lg text-gray-600">“{testimonial.quote}”</p>
                <div className="flex items-center gap-4">
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    width={56}
                    height={56}
                    sizes="56px"
                    className="rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Install Instructions */}
      <section className="py-24 bg-white" id="install">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 space-y-12">
          <div className="max-w-3xl space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Install WizFriends on your devices</h2>
            <p className="text-base sm:text-lg text-gray-600">
              WizFriends is a progressive web app, so you can add it to your home screen in just a few taps—no app store
              submission needed. Follow the quick steps below to stay one tap away from your community.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-indigo-700 mb-4">iPhone &amp; iPad (Safari)</h3>
              <ol className="space-y-3 text-gray-600 list-decimal list-inside">
                <li>Open wizfriends.com in Safari.</li>
                <li>Tap the <span className="font-medium">Share</span> icon.</li>
                <li>Select <span className="font-medium">Add to Home Screen</span>, then tap <span className="font-medium">Add</span>.</li>
              </ol>
            </div>
            <div className="rounded-3xl border border-pink-100 bg-pink-50/60 p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-pink-600 mb-4">Android (Chrome)</h3>
              <ol className="space-y-3 text-gray-600 list-decimal list-inside">
                <li>Open wizfriends.com in Chrome.</li>
                <li>Tap the menu ••• in the top-right corner.</li>
                <li>Choose <span className="font-medium">Install App</span> and confirm.</li>
              </ol>
            </div>
            <div className="rounded-3xl border border-violet-100 bg-violet-50/60 p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-violet-700 mb-4">Desktop (Chrome / Edge)</h3>
              <ol className="space-y-3 text-gray-600 list-decimal list-inside">
                <li>Visit wizfriends.com in your browser.</li>
                <li>Look for the <span className="font-medium">Install</span> icon in the address bar.</li>
                <li>Click <span className="font-medium">Install</span> to pin WizFriends like a native app.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 bg-indigo-900 text-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="max-w-3xl space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Ready to launch your community engine?</h2>
            <p className="text-indigo-100 text-base sm:text-lg">
              Book a strategy session with our community engineers or jump straight into the app to prototype your first experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/app"
                className="inline-flex items-center justify-center bg-white text-indigo-900 font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition"
              >
                Open WizFriends
              </Link>
              <Link
                href="mailto:hello@wizfriends.app"
                className="inline-flex items-center justify-center border border-white/60 text-white font-semibold px-8 py-3 rounded-full hover:bg-white hover:text-indigo-900 transition"
              >
                Talk to an expert
              </Link>
            </div>
          </div>
          <div className="bg-white/10 border border-white/30 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm uppercase tracking-[0.3em] text-indigo-200">What’s included</h3>
            <ul className="space-y-3 text-indigo-100">
              <li>• End-to-end onboarding with verified hosts</li>
              <li>• AI idea generation tuned for your city</li>
              <li>• Analytics on sentiment, attendance, and endorsements</li>
              <li>• Partner API for HRIS & campus systems</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
