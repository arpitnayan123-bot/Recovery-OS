"use client";

import type { ReactNode } from "react";
import { MediaGlobe } from "@/components/originkit/ui/hero-24/media-globe";
import { ScaleFrame } from "@/components/originkit/ui/hero-24/scale-frame";

const A = "/originkit/hero-24";

const HELVETICA = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const PHONE_QUERY = "(max-width: 639px)";
const TABLET_QUERY = "(min-width: 640px) and (max-width: 1279px)";
const DESKTOP_QUERY = "(min-width: 1280px)";

const REVEAL = "animate-hero-reveal";
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

const Backdrop = ({ src, className }: { src: string; className: string }) => (
  <img
    alt=""
    aria-hidden
    className={`pointer-events-none absolute left-0 top-0 h-full min-h-screen w-full max-w-none object-cover ${className}`}
    src={`${A}/${src}`}
  />
);

const GetStartedButton = ({
  className,
  href,
  label,
}: {
  className: string;
  href: string;
  label: string;
}) => (
  <a
    href={href}
    className={`relative flex shrink-0 cursor-pointer items-center justify-center rounded-[999px] transition-opacity duration-200 hover:opacity-80 drop-shadow-[0px_53px_7.5px_rgba(0,0,0,0),0px_34px_7px_rgba(0,0,0,0.01),0px_19px_6px_rgba(0,0,0,0.05),0px_9px_4.5px_rgba(0,0,0,0.09),0px_2px_2.5px_rgba(0,0,0,0.1)] ${className}`}
  >
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[999px]"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(255, 255, 255, 0.33) 0%, rgba(255, 255, 255, 0) 100%), linear-gradient(90deg, rgb(240, 240, 240) 0%, rgb(240, 240, 240) 100%)",
      }}
    />
    <p className="relative shrink-0 whitespace-nowrap text-[16px] leading-[1.15] tracking-[-0.32px] text-[#060e08]">
      {label}
    </p>
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_1px_1px_0px_white,inset_0px_-1.5px_0px_0px_rgba(0,0,0,0.1)]" />
  </a>
);

const SecondaryButton = ({
  className,
  href,
  label,
}: {
  className: string;
  href: string;
  label: string;
}) => (
  <a
    href={href}
    className={`relative flex shrink-0 cursor-pointer items-center justify-center rounded-[999px] border border-solid border-[rgba(255,255,255,0.1)] bg-[#252525] transition-opacity duration-200 hover:opacity-80 ${className}`}
  >
    <p className="relative shrink-0 whitespace-nowrap text-[16px] leading-[1.15] tracking-[-0.32px] text-white">
      {label}
    </p>
  </a>
);

const TrustChip = ({ className }: { className?: string }) => (
  <div
    className={`relative flex shrink-0 items-center gap-[8px] rounded-[999px] border border-solid border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] px-[14px] py-[8px] backdrop-blur-md ${className ?? ""}`}
  >
    <span className="relative size-[6px] shrink-0 rounded-full bg-[#00A1DB]" />
    <p className="relative shrink-0 whitespace-nowrap text-[12px] leading-none tracking-[-0.1px] text-white/80">
      Built on the MSMED Act, 2006
    </p>
  </div>
);

const Headline = ({
  size,
  leading,
  tracking,
  width,
  step = 80,
}: {
  size: number;
  leading: number;
  tracking: number;
  width?: string;
  step?: number;
}) => (
  <h1
    style={{ ...delay(step), fontSize: size, lineHeight: `${leading}px`, letterSpacing: `${tracking}px` }}
    className={`${REVEAL} relative shrink-0 text-center text-white`}
  >
    <span className={`relative block ${width ?? ""}`}>They had 45 days.</span>
    <span className="relative block">
      It&rsquo;s day <span className="text-[#00A1DB] tabular-nums">214</span>.
    </span>
    <span className="relative block">We go get it.</span>
  </h1>
);

const SubCopy = ({ className }: { className?: string }) => (
  <p
    style={delay(160)}
    className={`${REVEAL} relative w-full shrink-0 text-center text-[rgba(255,255,255,0.7)] ${className ?? ""}`}
  >
    Recovery OS watches every invoice, invokes the penalty interest the law already
    owes you, files on the government ODR portal — and collects.
  </p>
);

const EDGE_FADE = {
  left: "linear-gradient(to right, transparent 0%, #000 18%, #000 100%)",
  right: "linear-gradient(to left, transparent 0%, #000 18%, #000 100%)",
} as const;

const HAND_SLIDE = {
  left: "animate-hand-slide-in-left",
  right: "animate-hand-slide-in-right",
} as const;

const HandCutout = ({
  box,
  mask,
  maskSize,
  image,
  from,
  step,
}: {
  box: string;
  mask: string;
  maskSize: string;
  image: string;
  from: "left" | "right";
  step: number;
}) => (
  <div
    className={`pointer-events-none absolute ${HAND_SLIDE[from]} ${box}`}
    style={{
      ...delay(step),
      maskImage: `url("${A}/${mask}"), ${EDGE_FADE[from]}`,
      WebkitMaskImage: `url("${A}/${mask}"), ${EDGE_FADE[from]}`,
      maskMode: "alpha",
      maskComposite: "intersect",
      WebkitMaskComposite: "source-in",
      maskRepeat: "no-repeat",
      WebkitMaskRepeat: "no-repeat",
      maskSize: `${maskSize}, 100% 100%`,
      WebkitMaskSize: `${maskSize}, 100% 100%`,
    }}
  >
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <img alt="" className={`absolute max-w-none ${image}`} src={`${A}/hands.png`} />
    </div>
  </div>
);

const GlassCard = ({
  className,
  plate,
  step,
  children,
}: {
  className: string;
  plate: string;
  step: number;
  children: ReactNode;
}) => (
  <div
    className={`absolute flex flex-col items-start overflow-clip border-solid border-[rgba(255,255,255,0.1)] backdrop-blur-sm ${className}`}
  >
    <div
      className={`absolute h-[166px] w-[301px] -translate-x-1/2 -translate-y-1/2 blur-[20px] ${plate}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[rgba(255,255,255,0.1)] backdrop-blur-[2px]"
      />
    </div>
    {children}
  </div>
);

const StatCard = ({
  stat,
  caption,
  statSize,
  captionSize,
}: {
  stat: string;
  caption: string;
  statSize: string;
  captionSize: string;
}) => (
  <>
    <p className={`relative w-full shrink-0 font-bold italic leading-[1.4] text-white ${statSize}`}>
      {stat}
    </p>
    <p className={`relative w-full shrink-0 leading-[1.4] text-white opacity-70 ${captionSize}`}>
      {caption}
    </p>
  </>
);

const QuoteCard = ({
  quote,
  quoteSize,
  gap,
  avatarSize,
  nameSize,
  nameWidth,
}: {
  quote: string;
  quoteSize: string;
  gap: string;
  avatarSize: string;
  nameSize: string;
  nameWidth?: string;
}) => (
  <>
    <p className={`relative w-full shrink-0 leading-[1.4] text-white ${quoteSize}`}>{quote}</p>
    <div className={`relative flex w-full shrink-0 items-center ${gap}`}>
      <div className={`relative shrink-0 ${avatarSize}`}>
        <img
          alt=""
          className="absolute inset-0 block size-full max-w-none rounded-full"
          src={`${A}/avatar.png`}
        />
      </div>
      <div className={`relative flex min-w-px flex-[1_0_0] flex-col items-start leading-[1.3] text-white ${nameSize}`}>
        <p className="relative w-full shrink-0 font-bold italic">R. Mehta</p>
        <p className="relative w-full shrink-0 opacity-70">Director, Saboo Metalworks</p>
      </div>
    </div>
  </>
);

const PhoneFrame = () => (
  <div className="relative h-[836px] w-[402px] overflow-clip">
    {}
    <div className="absolute left-1/2 top-[76px] flex w-[370px] -translate-x-1/2 flex-col items-center gap-[20px]">
      <div className="relative flex w-full shrink-0 flex-col items-center gap-[8px] text-center text-white">
        <Headline size={35} leading={40} tracking={-1.4} width="w-[340px]" step={0} />
        <SubCopy className="text-[14px]" />
      </div>
      <div
        style={delay(240)}
        className={`${REVEAL} relative flex w-full shrink-0 flex-col items-start justify-center gap-[8px]`}
      >
        <GetStartedButton href="/login" label="Sign in" className="w-full px-[24px] py-[14px]" />
        <SecondaryButton href="#product" label="See how it works" className="w-full px-[24px] py-[14px]" />
      </div>
    </div>

    {}
    <div style={delay(320)} className={`${REVEAL} absolute left-[calc(50%+0.5px)] top-[418px] h-[324px] w-[323px] -translate-x-1/2 overflow-clip rounded-[999px]`}>
      <MediaGlobe query={PHONE_QUERY} />
    </div>

    <HandCutout
      box="left-[172px] top-[344.46px] h-[177.31px] w-[230px]"
      mask="hand-mask-top.svg"
      maskSize="230px 177.309px"
      image="left-[-97.68%] top-[-17.2%] h-[170.95%] w-[197.68%]"
      from="right"
      step={360}
    />

    <HandCutout
      box="left-[-27px] top-[571.65px] h-[212.8px] w-[224px]"
      mask="hand-mask-bottom.svg"
      maskSize="224px 212.801px"
      image="left-[-15.3%] top-[-63.32%] h-[163.32%] w-[232.73%]"
      from="left"
      step={440}
    />

    {}
    <GlassCard
      className="left-[20px] top-[445px] w-[136px] gap-[4px] rounded-[6px] border p-[12px]"
      plate="left-[calc(50%-0.5px)] top-[calc(50%+0.5px)]"
      step={400}
    >
      <StatCard
        stat="₹8.0L cr"
        caption="Trapped in MSME receivables"
        statSize="text-[16px]"
        captionSize="text-[12px]"
      />
    </GlassCard>

    {}
    <GlassCard
      className="left-[calc(50%+79px)] top-[667px] w-[212px] -translate-x-1/2 gap-[12px] rounded-[4.729px] border-[0.788px] p-[12px]"
      plate="left-[calc(50%+25.5px)] top-[calc(50%+4.21px)]"
      step={480}
    >
      <QuoteCard
        quote="Award came through in 94 days. Money settled the same week."
        quoteSize="text-[12px]"
        gap="gap-[6px]"
        avatarSize="size-[28px]"
        nameSize="text-[11px]"
      />
    </GlassCard>
  </div>
);

const TabletFrame = () => (
  <div className="relative h-[994px] w-[744px] overflow-clip">
    {}
    <div className="absolute left-[149px] top-[80px] flex w-[446px] flex-col items-center gap-[22px]">
      <div className="relative flex w-full shrink-0 flex-col items-center gap-[12px] text-center text-white">
        <TrustChip />
        <Headline size={44} leading={50} tracking={-1.76} step={80} />
        <SubCopy className="text-[16px]" />
      </div>
      <div
        style={delay(240)}
        className={`${REVEAL} relative flex shrink-0 items-center gap-[12px]`}
      >
        <GetStartedButton href="/login" label="Sign in" className="px-[24px] py-[16px]" />
        <SecondaryButton href="#product" label="See how it works" className="px-[24px] py-[16px]" />
      </div>
    </div>

    {}
    <div style={delay(320)} className={`${REVEAL} absolute left-[163px] top-[448px] h-[420px] w-[418px] overflow-clip rounded-[999px]`}>
      <MediaGlobe query={TABLET_QUERY} />
    </div>

    <HandCutout
      box="left-[401px] top-[383.289px] h-[264.423px] w-[343px]"
      mask="ipad-mask-top.svg"
      maskSize="343px 264.423px"
      image="left-[-97.68%] top-[-17.2%] h-[170.95%] w-[197.68%]"
      from="right"
      step={360}
    />

    <HandCutout
      box="left-0 top-[692.875px] h-[267.9px] w-[282px]"
      mask="ipad-mask-bottom.svg"
      maskSize="282px 267.9px"
      image="left-[-15.3%] top-[-63.32%] h-[163.32%] w-[232.73%]"
      from="left"
      step={440}
    />

    {}
    <GlassCard
      className="left-[113px] top-[473px] w-[169px] gap-[4px] rounded-[6px] border p-[16px]"
      plate="left-1/2 top-1/2"
      step={400}
    >
      <StatCard
        stat="₹8.0L cr"
        caption="Trapped in MSME receivables"
        statSize="text-[20px]"
        captionSize="text-[14px]"
      />
    </GlassCard>

    {}
    <GlassCard
      className="left-[441px] top-[740px] w-[246px] gap-[16px] rounded-[6px] border p-[14px]"
      plate="left-[calc(50%-0.5px)] top-1/2"
      step={480}
    >
      <QuoteCard
        quote="Award came through in 94 days — money settled to our account the same week."
        quoteSize="text-[14px]"
        gap="gap-[6px]"
        avatarSize="size-[32px]"
        nameSize="text-[12px]"
        nameWidth="w-[127px]"
      />
    </GlassCard>
  </div>
);

const DesktopFrame = () => (
  <div className="relative h-[913px] w-[1280px] overflow-clip">
    {}
    <div className="absolute left-[417px] top-[72px] flex w-[446px] flex-col items-center gap-[22px]">
      <div className="relative flex w-full shrink-0 flex-col items-center gap-[12px] text-center text-white">
        <TrustChip />
        <Headline size={48} leading={55} tracking={-1.92} step={80} />
        <SubCopy className="text-[16px]" />
      </div>
      <div
        style={delay(240)}
        className={`${REVEAL} relative flex shrink-0 items-center gap-[12px]`}
      >
        <GetStartedButton href="/login" label="Sign in" className="px-[24px] py-[16px]" />
        <SecondaryButton href="#product" label="See how it works" className="px-[24px] py-[16px]" />
      </div>
    </div>

    {}
    <div style={delay(320)} className={`${REVEAL} absolute left-[431px] top-[456px] h-[420px] w-[418px] overflow-clip rounded-[999px]`}>
      <MediaGlobe query={DESKTOP_QUERY} />
    </div>

    <HandCutout
      box="left-[794px] top-[269.169px] h-[374.664px] w-[486px]"
      mask="desk-mask-top.svg"
      maskSize="486px 374.664px"
      image="left-[-97.68%] top-[-17.2%] h-[170.95%] w-[197.68%]"
      from="right"
      step={360}
    />

    <HandCutout
      box="left-0 top-[592.398px] h-[420.85px] w-[443px]"
      mask="desk-mask-bottom.svg"
      maskSize="443px 420.85px"
      image="left-[-15.3%] top-[-63.32%] h-[163.32%] w-[232.73%]"
      from="left"
      step={440}
    />

    {}
    <GlassCard
      className="left-[339px] top-[504px] w-[169px] gap-[4px] rounded-[6px] border p-[16px]"
      plate="left-1/2 top-1/2"
      step={400}
    >
      <StatCard
        stat="₹8.0L cr"
        caption="Trapped in MSME receivables"
        statSize="text-[20px]"
        captionSize="text-[14px]"
      />
    </GlassCard>

    {}
    <GlassCard
      className="left-[803px] top-[685px] w-[246px] gap-[16px] rounded-[6px] border p-[14px]"
      plate="left-[calc(50%-0.5px)] top-1/2"
      step={480}
    >
      <QuoteCard
        quote="Award came through in 94 days — money settled to our account the same week."
        quoteSize="text-[14px]"
        gap="gap-[6px]"
        avatarSize="size-[32px]"
        nameSize="text-[12px]"
        nameWidth="w-[127px]"
      />
    </GlassCard>
  </div>
);

export const Sec2Hero = () => (
  <section
    className="relative w-full overflow-hidden bg-[#101216]"
    style={{ fontFamily: HELVETICA }}
    aria-label="Recovery OS — automated MSME payment recovery"
  >
    <Backdrop src="bg.png" className="min-[640px]:hidden" />
    <Backdrop src="bg-ipad.png" className="hidden min-[640px]:block desktop-sm:hidden" />
    <Backdrop src="bg-desktop.png" className="hidden desktop-sm:block" />

    {}
    <ScaleFrame frameWidth={402} className="relative w-full overflow-hidden min-[640px]:hidden">
      <PhoneFrame />
    </ScaleFrame>
    <ScaleFrame
      frameWidth={744}
      className="relative hidden w-full overflow-hidden min-[640px]:block desktop-sm:hidden"
    >
      <TabletFrame />
    </ScaleFrame>
    <ScaleFrame
      frameWidth={1280}
      className="relative hidden w-full overflow-hidden desktop-sm:block"
    >
      <DesktopFrame />
    </ScaleFrame>
  </section>
);
