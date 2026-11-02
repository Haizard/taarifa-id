'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowRight, BadgeCheck, Building2, ChevronLeft, ChevronRight, GraduationCap, HeartPulse, MapPin, Search, ShieldCheck, Star, Wrench } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ProviderMark } from '@/components/marketplace/ProviderMark';

type Category = 'hospital' | 'school' | 'garage';
type Service = { id: string; title: string; description: string | null; delivery_mode: string; price_type: string; price_amount: string | null; provider: { category: Category; display_name: string; logo_url?: string | null; verification_status: string; region: string | null; district: string | null; rating?: number; review_count?: number } };

const slides = [
  { category: 'hospital' as const, eyebrow: 'Care, within reach', title: 'Find the care you need, with confidence.', body: 'Explore clinics and hospitals, compare services, and send your request directly to the provider you choose.', image: '/images/marketplace/hero-healthcare.webp', alt: 'A clinician talking with a patient in a bright clinic', href: '/services?category=hospital', icon: HeartPulse, tint: 'from-emerald-950/90 via-emerald-950/55 to-slate-950/10' },
  { category: 'school' as const, eyebrow: 'A good start matters', title: 'Find the right school support for your family.', body: 'Explore school services, ask questions, and manage each request with clear updates along the way.', image: '/images/marketplace/hero-school.webp', alt: 'A teacher helping a parent and student at school', href: '/services?category=school', icon: GraduationCap, tint: 'from-slate-950/90 via-slate-950/50 to-slate-950/10' },
  { category: 'garage' as const, eyebrow: 'Help for the unexpected', title: 'Get back on the road with local support.', body: 'Find garages for roadside repairs, towing, and vehicle recovery, then compare the response that works for you.', image: '/images/marketplace/hero-garage.webp', alt: 'A mechanic assisting a driver with a safely stopped car', href: '/services?category=garage', icon: Wrench, tint: 'from-slate-950/90 via-slate-950/55 to-slate-950/10' },
];

const categories = [
  { id: 'hospital', name: 'Hospitals & clinics', detail: 'Appointments and care requests', icon: HeartPulse, className: 'text-rose-700 bg-rose-50 ring-rose-100' },
  { id: 'school', name: 'Schools', detail: 'Admissions and student support', icon: GraduationCap, className: 'text-amber-700 bg-amber-50 ring-amber-100' },
  { id: 'garage', name: 'Emergency garages', detail: 'Roadside repair and recovery', icon: Wrench, className: 'text-emerald-700 bg-emerald-50 ring-emerald-100' },
];

export default function Home() {
  const [slide, setSlide] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const current = slides[slide];
  const servicesQuery = useQuery({ queryKey: ['home-featured-services'], queryFn: () => api.get<Service[]>('/marketplace/services') });
  const statsQuery = useQuery({ queryKey: ['public-stats'], queryFn: () => api.get<{ providers: { hospitals: number; schools: number; garages: number }; active_services: number }>('/public/stats') });

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((value) => (value + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, []);

  const browseHref = `/services${category || search ? `?${new URLSearchParams({ ...(category ? { category } : {}), ...(search ? { q: search } : {}) }).toString()}` : ''}`;
  const featured = (servicesQuery.data ?? []).slice(0, 3);

  return <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Taarifa ID home" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-lg font-bold text-white">T</span>
          <span className="text-[17px] font-extrabold tracking-tight">TAARIFA <span className="text-emerald-700">ID</span></span>
        </Link>
        <nav className="hidden items-center gap-7 text-[14px] font-medium text-slate-600 md:flex">
          <Link href="/services" className="transition hover:text-emerald-700">Explore services</Link>
          <a href="#how-it-works" className="transition hover:text-emerald-700">How it works</a>
          <a href="#for-organizations" className="transition hover:text-emerald-700">For organizations</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-100 sm:px-4 sm:text-sm">Log in</Link>
          <Link href="/register" className="rounded-lg bg-emerald-700 px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-emerald-800 sm:px-4 sm:text-sm">Create account</Link>
        </div>
      </div>
    </header>

    <main>
      <section className="relative mx-auto mt-5 h-[530px] max-w-7xl overflow-hidden rounded-[28px] bg-slate-900 sm:mx-6 lg:mx-auto lg:h-[570px]">
        {slides.map((item, index) => <div key={item.category} className={`absolute inset-0 transition-opacity duration-700 ${index === slide ? 'opacity-100' : 'pointer-events-none opacity-0'}`} aria-hidden={index !== slide}>
          <img src={item.image} alt={item.alt} className="h-full w-full object-cover object-center" fetchPriority={index === 0 ? 'high' : 'auto'} />
          <div className={`absolute inset-0 bg-gradient-to-r ${item.tint}`} />
        </div>)}
        <div className="relative z-10 flex h-full max-w-2xl flex-col justify-center px-6 py-10 text-white sm:px-12 lg:px-16">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[12px] font-semibold backdrop-blur"><current.icon size={15} />{current.eyebrow}</div>
          <h1 key={current.category} className="max-w-xl text-[40px] font-bold leading-[1.08] tracking-[-1.5px] sm:text-[54px] lg:text-[60px]">{current.title}</h1>
          <p className="mt-5 max-w-lg text-[15px] leading-7 text-white/85 sm:text-[17px]">{current.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={current.href} className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50">Explore {current.category === 'garage' ? 'garages' : current.category === 'school' ? 'schools' : 'healthcare'} <ArrowRight size={17} /></Link>
            <Link href="/register" className="inline-flex h-12 items-center rounded-xl border border-white/35 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">Join Taarifa ID</Link>
          </div>
        </div>
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2 sm:bottom-8 sm:right-10">
          <button aria-label="Previous slide" onClick={() => setSlide((slide + slides.length - 1) % slides.length)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-slate-950/30 text-white backdrop-blur transition hover:bg-slate-950/55"><ChevronLeft size={20} /></button>
          {slides.map((item, index) => <button key={item.category} onClick={() => setSlide(index)} aria-label={`Show ${item.category} slide`} aria-current={index === slide} className={`h-2 rounded-full transition-all ${index === slide ? 'w-8 bg-white' : 'w-2 bg-white/60'}`} />)}
          <button aria-label="Next slide" onClick={() => setSlide((slide + 1) % slides.length)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-slate-950/30 text-white backdrop-blur transition hover:bg-slate-950/55"><ChevronRight size={20} /></button>
        </div>
        <div className="absolute bottom-8 left-6 z-20 hidden items-center gap-2 text-[12px] font-medium text-white/75 sm:flex sm:left-12 lg:left-16"><span className="h-px w-8 bg-white/65" />{String(slide + 1).padStart(2, '0')} <span className="text-white/45">/ 03</span></div>
      </section>

      <section className="relative z-20 mx-auto -mt-7 max-w-5xl px-4 sm:px-8">
        <form action="/services" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,.13)] sm:flex sm:items-center sm:gap-3 sm:p-3.5">
          <label className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-slate-400"><Search size={20} /><input name="q" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="What service do you need today?" className="w-full bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400" /></label>
          <label className="flex items-center gap-2 border-t border-slate-100 px-2 py-3 text-slate-400 sm:border-l sm:border-t-0 sm:px-4"><MapPin size={18} /><select aria-label="Service category" name="category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-transparent text-[14px] font-medium text-slate-700 outline-none sm:min-w-44"><option value="">All categories</option><option value="hospital">Hospitals & clinics</option><option value="school">Schools</option><option value="garage">Emergency garages</option></select></label>
          <Link href={browseHref} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 text-sm font-bold text-white transition hover:bg-emerald-800">Search <ArrowRight size={16} /></Link>
        </form>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-8 lg:px-10">
        <div className="mb-6 flex items-end justify-between gap-4"><div><div className="text-[11px] font-bold uppercase tracking-[.16em] text-emerald-700">Browse by need</div><h2 className="mt-2 text-[25px] font-bold tracking-tight text-slate-900 sm:text-[30px]">Services for everyday life</h2></div><Link href="/services" className="hidden items-center gap-1 text-sm font-semibold text-emerald-700 sm:flex">View all services <ArrowRight size={16} /></Link></div>
        <div className="grid gap-3 sm:grid-cols-3">
          {categories.map((item) => <Link key={item.id} href={`/services?category=${item.id}`} className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 ${item.className}`}><item.icon size={25} /></span>
            <span className="min-w-0"><span className="block text-[16px] font-bold text-slate-900">{item.name}</span><span className="mt-1 block text-[13px] text-slate-500">{item.detail}</span></span><ArrowDownRight className="ml-auto text-slate-300 transition group-hover:text-emerald-700" size={19} />
          </Link>)}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4">{[
          ['Hospitals & clinics', statsQuery.data?.providers.hospitals], ['Schools', statsQuery.data?.providers.schools], ['Emergency garages', statsQuery.data?.providers.garages], ['Services available', statsQuery.data?.active_services],
        ].map(([label, value]) => <div key={String(label)} className="px-2 py-1 text-center sm:border-r sm:border-slate-100 last:border-0"><div className="text-[20px] font-bold text-slate-900">{value ?? '—'}</div><div className="mt-0.5 text-[11px] text-slate-500">{label}</div></div>)}</div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-10">
          <div className="mb-6 flex items-end justify-between gap-4"><div><div className="text-[11px] font-bold uppercase tracking-[.16em] text-emerald-700">From local providers</div><h2 className="mt-2 text-[25px] font-bold tracking-tight text-slate-900 sm:text-[30px]">Popular services</h2></div><Link href="/services" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">Explore marketplace <ArrowRight size={16} /></Link></div>
          {featured.length ? <div className="grid gap-4 md:grid-cols-3">{featured.map((service) => <Link key={service.id} href={`/services?category=${service.provider.category}`} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl">
            <div className="flex items-center gap-3"><ProviderMark name={service.provider.display_name} category={service.provider.category} logoUrl={service.provider.logo_url} /><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold text-slate-900">{service.provider.display_name}</div><div className="mt-0.5 flex items-center gap-1 text-[11px] capitalize text-slate-500">{service.provider.verification_status === 'verified' && <BadgeCheck size={13} className="text-emerald-600" />} {service.provider.category}</div></div>{service.provider.rating != null && <div className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[12px] font-bold text-amber-700"><Star size={13} fill="currentColor" />{service.provider.rating}</div>}</div>
            <h3 className="mt-5 text-[18px] font-bold text-slate-900 group-hover:text-emerald-800">{service.title}</h3><p className="mt-1 line-clamp-2 min-h-10 text-[13px] leading-5 text-slate-500">{service.description || 'Request this service from the provider and agree on the details directly.'}</p>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[12px]"><span className="text-slate-500">{service.provider.review_count ? `${service.provider.review_count} verified reviews` : 'New on Taarifa ID'}</span><span className="font-semibold text-slate-800">{service.price_type === 'fixed' && service.price_amount ? `${Number(service.price_amount).toLocaleString()} TZS` : service.price_type === 'free' ? 'Free' : 'Request a quote'}</span></div>
          </Link>)}</div> : <div className="rounded-2xl border border-slate-200 bg-slate-50 p-7 text-center"><p className="font-semibold text-slate-800">New services are being added.</p><Link href="/services" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">Browse the marketplace <ArrowRight size={15} /></Link></div>}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:px-10">
        <div className="grid items-center gap-9 lg:grid-cols-[.8fr_1.2fr]">
          <div><div className="text-[11px] font-bold uppercase tracking-[.16em] text-emerald-700">Simple and in your control</div><h2 className="mt-2 text-[30px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[36px]">From need to service, in a few clear steps.</h2><p className="mt-4 max-w-md text-[15px] leading-7 text-slate-600">Taarifa ID helps you connect with providers while keeping your saved information private and sharing only what a request needs.</p><Link href="/services" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">Find a service <ArrowRight size={16} /></Link></div>
          <div className="grid gap-3 sm:grid-cols-3">{[
            { n: '01', title: 'Choose a service', text: 'Browse providers and find the service that matches your need.', icon: Search },
            { n: '02', title: 'Share your request', text: 'Send the provider only the details needed to respond.', icon: ShieldCheck },
            { n: '03', title: 'Compare and decide', text: 'Review provider offers and choose how to proceed.', icon: BadgeCheck },
          ].map((item) => <div key={item.n} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-[12px] font-bold text-emerald-700">{item.n}</span><item.icon size={20} className="text-emerald-700" /></div><h3 className="mt-8 text-[16px] font-bold text-slate-900">{item.title}</h3><p className="mt-2 text-[13px] leading-5 text-slate-500">{item.text}</p></div>)}</div>
        </div>
      </section>

      <section id="for-organizations" className="mx-auto max-w-7xl px-4 pb-16 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-6 rounded-[24px] bg-emerald-950 px-6 py-8 text-white sm:flex-row sm:items-center sm:justify-between sm:px-9 sm:py-9"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Building2 size={23} /></span><div><h2 className="text-[22px] font-bold">Are you a service provider?</h2><p className="mt-2 max-w-xl text-[14px] leading-6 text-emerald-100/80">Create your organization profile, publish services, manage incoming requests, and build a track record clients can review.</p></div></div><Link href="/register?type=business" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-50">Join as a provider <ArrowRight size={16} /></Link></div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><Link href="/" className="flex items-center gap-2 font-bold text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700 text-xs text-white">T</span>TAARIFA ID</Link><span>Services, organizations, and information in one connected place.</span><div className="flex gap-4"><Link href="/services" className="hover:text-emerald-700">Services</Link><Link href="/login" className="hover:text-emerald-700">Log in</Link><Link href="/register" className="hover:text-emerald-700">Create account</Link></div></div>
      </footer>
    </main>
  </div>;
}
