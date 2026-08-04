/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, MouseEvent, TouchEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getQuotes } from './data/quotes';
import { useDynamicData } from './hooks/useDynamicData';
import QuoteSubmit from './components/QuoteSubmit';
import AboutPopup from './components/AboutPopup';
import { audio } from './utils/audio';
import { MemoryCluster, MemoryContent, Quote, ChimeRipple, FloatingQuoteInstance, AboutLineInstance } from './types';
import { Volume2, VolumeX } from 'lucide-react';

export default function App() {
  const { loading: dataLoading, aboutLines: ABOUT_LINES, memoryClusters: MEMORY_CLUSTERS, memoryLeafMap: MEMORY_LEAF_MAP, leafTagMap: LEAF_TAG } = useDynamicData();

  const memoryClustersRef = useRef(MEMORY_CLUSTERS);
  const memoryLeafMapRef = useRef(MEMORY_LEAF_MAP);
  const leafTagMapRef = useRef(LEAF_TAG);

  useEffect(() => {
    memoryClustersRef.current = MEMORY_CLUSTERS;
    memoryLeafMapRef.current = MEMORY_LEAF_MAP;
    leafTagMapRef.current = LEAF_TAG;
  }, [MEMORY_CLUSTERS, MEMORY_LEAF_MAP, LEAF_TAG]);

  // Phase & intro states
  const [phase, setPhase] = useState<'loading' | 'about' | 'alley'>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [aboutComplete, setAboutComplete] = useState(false);

  // About lines as spatial-zoom centered elements
  const aboutLinesRef = useRef<AboutLineInstance[]>([]);
  const aboutCompleteRef = useRef(false);

  // Experience start & audio states
  const [isMuted, setIsMuted] = useState(false);
  const [muteNotice, setMuteNotice] = useState<string | null>(null);

  // Synchronized state refs for closure safety in RAF loop
  const hasStartedRef = useRef(false);
  const isHoveringRef = useRef(false);
  useEffect(() => {
    hasStartedRef.current = phase === 'alley';
  }, [phase]);

  // Scattered floating quotes state
  const [activeQuotes, setActiveQuotes] = useState<FloatingQuoteInstance[]>([]);
  const quoteQueueIndexRef = useRef(0);

  // Sound click ripples
  const [ripples, setRipples] = useState<ChimeRipple[]>([]);

  // Track finished quotes and forgetful place mode
  const [finishedQuotesCount, setFinishedQuotesCount] = useState(0);
  const [reachedZoomEnd, setReachedZoomEnd] = useState(false);

  // Canvas and parallax tracking references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appContainerRef = useRef<HTMLDivElement | null>(null);
  const glowOverlayRef = useRef<HTMLDivElement | null>(null);
  const rhombusContainerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const emittingDotRef = useRef<HTMLDivElement | null>(null);
  const scrollInstructionRef = useRef<HTMLDivElement | null>(null);
  
  // High-performance mouse positioning
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  
  // Lagging parallax coordinate references
  const parallaxRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // 3D Spatial Scroll Zoom Tracking (about section occupies -2800 to 0, alley from 0+)
  const scrollZRef = useRef(-2800);
  const targetScrollZRef = useRef(-2800);
  const [isZooming, setIsZooming] = useState(false);
  const isZoomingRef = useRef(false);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Boundary tracking references to prevent stale closures and manage state changes
  const hasPassedEndRef = useRef(false);
  const hasPassedStartRef = useRef(false);
  const reachedZoomEndRef = useRef(false);
  const lastChimeZRef = useRef(0);
  const lastScrollTimeRef = useRef(Date.now());
  const lastInteractionTimeRef = useRef(Date.now());
  const lastTouchYRef = useRef(0);
  const idleProgressRef = useRef(0);
  const peakIdleProgressRef = useRef(0);
  const triggerRefreshRef = useRef<() => void>(() => {});

  // Memory constellation interaction state (Phase 3, silent space)
  const [activeContent, setActiveContent] = useState<MemoryContent | null>(null);
  const [activeContentTag, setActiveContentTag] = useState<string | null>(null);
  const activeLeafRef = useRef<string | null>(null);
  const activeLeafPosRef = useRef<{ x: number; y: number } | null>(null);
  const contentFadeRef = useRef(0);
  const contentExitingRef = useRef(false);
  const hoveredClusterRef = useRef<string | null>(null);
  const hoveredLeafRef = useRef<string | null>(null);
  const nodeHoverRef = useRef(false);
  const dwellStartRef = useRef(0);
  const memoryNodesRef = useRef<{ id: string; kind: 'leaf' | 'group'; x: number; y: number; r: number }[]>([]);
  const revealClusterRef = useRef<string | null>(null);
  const revealGroupRef = useRef<string | null>(null);
  const clusterRevealRef = useRef<Record<string, number>>({});
  const groupRevealRef = useRef<Record<string, number>>({});
  const prevActiveClusterRef = useRef<string | null>(null);
  const prevActiveGroupRef = useRef<string | null>(null);
  const lastMouseMoveRef = useRef(Date.now());

  // Middle-mouse pan: drag repositions the memory constellation
  const panRef = useRef({ x: 0, y: 0 });
  const panTargetRef = useRef({ x: 0, y: 0 });
  const panningRef = useRef(false);
  const panStartMouseRef = useRef({ x: 0, y: 0 });
  const panStartPanRef = useRef({ x: 0, y: 0 });

  // Sync state to ref for stale closure prevention in interval timers
  useEffect(() => {
    isZoomingRef.current = isZooming;
  }, [isZooming]);

  // Phase ref for RAF loop and wheel handler
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // About completion ref sync
  useEffect(() => {
    aboutCompleteRef.current = aboutComplete;
  }, [aboutComplete]);

  // Clean up zoom timer on unmount
  useEffect(() => {
    return () => {
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, []);

  // Wheel event listener for spatial Z-zoom depth
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {

      // Reset activity and idle timer on scroll activity
      lastScrollTimeRef.current = Date.now();
      lastInteractionTimeRef.current = Date.now();

      // Try to resume audio on scroll (some browsers treat wheel as user gesture)
      audio.resume();

      if (phaseRef.current === 'alley') {
        // Prioritize active zoom mode
        setIsZooming(true);
        if (zoomTimeoutRef.current) {
          clearTimeout(zoomTimeoutRef.current);
        }
        zoomTimeoutRef.current = setTimeout(() => {
          setIsZooming(false);
        }, 2500);
      }
      
      // REVERSED scroll: scrolling down (deltaY > 0) pulls out, scrolling up (deltaY < 0) zooms deeper
      targetScrollZRef.current -= e.deltaY * 0.75;
      
      // Clamp target zoom range: -2800 (about section start) to 4200 (end of spatial layout)
      targetScrollZRef.current = Math.max(-2800, Math.min(4200, targetScrollZRef.current));
    };

    const handleTouchStart = (e: TouchEvent) => {
      lastTouchYRef.current = e.touches[0].clientY;
      audio.resume();
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaY = lastTouchYRef.current - touch.clientY;
      lastTouchYRef.current = touch.clientY;

      lastScrollTimeRef.current = Date.now();
      lastInteractionTimeRef.current = Date.now();

      if (phaseRef.current === 'alley') {
        setIsZooming(true);
        if (zoomTimeoutRef.current) {
          clearTimeout(zoomTimeoutRef.current);
        }
        zoomTimeoutRef.current = setTimeout(() => {
          setIsZooming(false);
        }, 2500);
      }

      targetScrollZRef.current += deltaY * 0.75;
      targetScrollZRef.current = Math.max(-2800, Math.min(4200, targetScrollZRef.current));
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Shuffle quotes initially to give a random flow every session
  const shuffledQuotesRef = useRef<Quote[]>([]);
  useEffect(() => {
    getQuotes().then((quotes) => {
      shuffledQuotesRef.current = [...quotes].sort(() => Math.random() - 0.5);
    });
  }, []);

  // Initialize about lines with staggered z-offsets for spatial zoom reveal
  useEffect(() => {
    if (ABOUT_LINES.length === 0) return;
    const lines: AboutLineInstance[] = ABOUT_LINES.map((text, idx) => ({
      id: `about-${idx}`,
      text,
      idx,
      depth: 0.4 + (idx / ABOUT_LINES.length) * 1.2,
      zOffset: 800 - idx * 160,
    }));
    aboutLinesRef.current = lines;
  }, [ABOUT_LINES]);

  // Auto-transition: loading -> about only (about -> alley is scroll-based)
  useEffect(() => {
    if (phase === 'loading') {
      const progressInterval = setInterval(() => {
        setLoadingProgress(p => {
          if (p >= 99 && dataLoading) return 99; // Hold at 99% if data is still loading
          return Math.min(p + 4, 100);
        });
      }, 100);
      
      let aboutTimer: NodeJS.Timeout;
      if (!dataLoading) {
        aboutTimer = setTimeout(() => {
          audio.init();
          setPhase('about');
        }, 2800);
      }
      return () => {
        clearInterval(progressInterval);
        if (aboutTimer) clearTimeout(aboutTimer);
      };
    }
  }, [phase, dataLoading]);

  // 1. Core Canvas Render Loop (Grain + High-Performance 3D Parallax Interpolation + Spot Clearance)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Dynamic resize handler
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Create static offscreen high-performance noise tile
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 128;
    noiseCanvas.height = 128;
    const noiseCtx = noiseCanvas.getContext('2d')!;
    const noiseImgData = noiseCtx.createImageData(128, 128);
    const noiseData = noiseImgData.data;

    // Prefill noise canvas with high-quality grain values
    for (let i = 0; i < noiseData.length; i += 4) {
      const val = Math.floor(Math.random() * 255);
      noiseData[i] = val; // R
      noiseData[i + 1] = val; // G
      noiseData[i + 2] = val; // B
      noiseData[i + 3] = 42; // Subtle alpha intensity of grain
    }
    noiseCtx.putImageData(noiseImgData, 0, 0);

    // Initial mouse positions set to center
    mouseRef.current.x = width / 2;
    mouseRef.current.y = height / 2;
    mouseRef.current.targetX = width / 2;
    mouseRef.current.targetY = height / 2;

    const render = () => {
      // Interpolate spatial zoom Z position with a slower, more cozy cinematic drift
      scrollZRef.current += (targetScrollZRef.current - scrollZRef.current) * 0.05;
      const sz = scrollZRef.current;

      // Ease the middle-mouse pan offset up front so the canvas constellation and
      // the DOM center emitting dot read the exact same eased value every frame.
      panRef.current.x += (panTargetRef.current.x - panRef.current.x) * 0.12;
      panRef.current.y += (panTargetRef.current.y - panRef.current.y) * 0.12;

       // Update Memories Idle Progress in the silent space (sz >= 4100)
       const inSilentSpace = sz >= 4100;
       const isIdle = inSilentSpace && (Date.now() - lastScrollTimeRef.current >= 2000);
       const targetIdleProgress = isIdle ? 1.0 : 0.0;
        // Smoothly interpolate idle progress (asymmetric: slow fade-in, 5x faster fade-out)
        const idleSpeed = targetIdleProgress > idleProgressRef.current ? 0.006 : 0.03;
        idleProgressRef.current += (targetIdleProgress - idleProgressRef.current) * idleSpeed;
       const idleProgress = idleProgressRef.current;

       // Handle melody transition based on silent space
       if (inSilentSpace) {
         audio.setMelodyMode('night');
       } else {
         audio.setMelodyMode('day');
       }


      // Cursor normalization when left idle (for 5 seconds, regardless of space)
      const isIdleGeneral = Date.now() - lastInteractionTimeRef.current >= 5000;
      if (isIdleGeneral) {
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Smoothly drift the target coordinates of the mouse to the center
        mouseRef.current.targetX += (centerX - mouseRef.current.targetX) * 0.05;
        mouseRef.current.targetY += (centerY - mouseRef.current.targetY) * 0.05;

        // Smoothly drift the parallax target to center as well
        parallaxRef.current.targetX += (0 - parallaxRef.current.targetX) * 0.05;
        parallaxRef.current.targetY += (0 - parallaxRef.current.targetY) * 0.05;
      }

      // 1. Interpolate mouse positions for smooth trailing spotlight look
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.12;
      mouse.y += (mouse.targetY - mouse.y) * 0.12;

      // 2. Interpolate parallax offsets for subtle floating layer motion (lagging behind mouse)
      const parallax = parallaxRef.current;
      parallax.x += (parallax.targetX - parallax.x) * 0.08;
      parallax.y += (parallax.targetY - parallax.y) * 0.08;

      // Calculate quote dissolution progress (clamped 0 to 1)
      // Quotes dissolve completely by sz = 1500 before Rhombus appears
      const pQuotes = Math.max(0, Math.min(1, (sz - 1200) / 300));

      // Calculate deep zoom progress for the transition (clamped 0 to 1)
      const pZoom = sz >= 3000 ? Math.max(0, Math.min(1, (sz - 3000) / 1200)) : 0;

      // Actively trigger beautiful windchimes at discrete steps as they zoom/travel through Z-space
      if (isZoomingRef.current && phaseRef.current === 'alley') {
        const diff = Math.abs(sz - lastChimeZRef.current);
        if (diff >= 180) {
          const zPercent = sz / 4200;
          audio.playWindchimeClick(0.5, 0.5, zPercent);
          lastChimeZRef.current = sz;
        }
      } else {
        // Smoothly match lastChimeZRef with current sz while idle so next zoom starts exactly on 180px distance
        lastChimeZRef.current = sz;
      }

      // 2b. Check boundary transitions and update reachedZoomEnd state dynamically
      if (phaseRef.current === 'alley' && (isZoomingRef.current || sz > 5)) {
        // We set reachedZoomEnd to true only when they are very close to the end of the zoom,
        // and they are NOT actively scrolling back out (targetScrollZRef.current >= 4050)
        const reachedEnd = sz >= 4050 && targetScrollZRef.current >= 4050;
        if (reachedEnd !== reachedZoomEndRef.current) {
          reachedZoomEndRef.current = reachedEnd;
          setReachedZoomEnd(reachedEnd);
        }

        // Handle infinite-alley refreshing when crossing boundaries
        // Passing past the zoom-in limit (all items faded out):
        if (sz >= 4050) {
          if (!hasPassedEndRef.current) {
            hasPassedEndRef.current = true;
          }
        } else if (sz < 1200) {
          // If they zoom back (scrolling out), refresh quotes to give them a completely fresh set of thoughts!
          if (hasPassedEndRef.current) {
            hasPassedEndRef.current = false;
            if (isZoomingRef.current) {
              triggerRefreshRef.current();
            }
          }
        }

        // Symmetrically, passing past the zoom-out start (returning to 0):
        if (sz <= 50) {
          if (!hasPassedStartRef.current) {
            hasPassedStartRef.current = true;
          }
        } else if (sz > 250) {
          // If they zoom forward again after being at start, refresh quotes!
          if (hasPassedStartRef.current) {
            hasPassedStartRef.current = false;
            if (isZoomingRef.current) {
              triggerRefreshRef.current();
            }
          }
        }
      } else {
        // Reset boundary state refs when zoom is inactive and we are fully back
        hasPassedEndRef.current = false;
        hasPassedStartRef.current = false;
        if (reachedZoomEndRef.current) {
          reachedZoomEndRef.current = false;
          setReachedZoomEnd(false);
        }
      }

      // Transition smoothly from light off-white (Space 1) to dark space (Space 2) based on pZoom
      const container = appContainerRef.current;
      if (container) {
        const r = Math.round(250 + (8 - 250) * pZoom);
        const g = Math.round(249 + (12 - 249) * pZoom);
        const b = Math.round(245 + (22 - 245) * pZoom);
        container.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

        const textR = Math.round(28 + (250 - 28) * pZoom);
        const textG = Math.round(25 + (249 - 25) * pZoom);
        const textB = Math.round(23 + (245 - 23) * pZoom);
        container.style.color = `rgb(${textR}, ${textG}, ${textB})`;

        container.style.cursor = 'none';
      }

      // Smoothly fade out ambient parchment paper radial glow based on pZoom
      if (glowOverlayRef.current) {
        glowOverlayRef.current.style.opacity = String(1 - pZoom);
      }

      // Declare variables for canvas backlight glow and custom cursor dot split-rendering
      let currentRhombusScale = 0.85;
      let currentPFill = 0;

      // Handle Rhombus Space Sanctuary reveal
      if (rhombusContainerRef.current) {
        let rhombusScale = 0.85;
        let rhombusOpacity = 0;
        let borderProgress = 0;
        let textOpacity = 0;
        let dotOpacity = 0;
        let pFill = 0;

        // Continuous scale update to avoid size resets and resize jerks
        if (sz >= 1500) {
          const baseGrowth = ((sz - 1500) / 1500) * 0.40; // grows from 0 to 0.72 over range 1500-3000
          const acceleration = pZoom > 0 ? Math.pow(pZoom, 2.0) * 98.43 : 0; // accelerates to 98.43 over range 3000-4200
          rhombusScale = 0.85 + baseGrowth + acceleration; // ranges smoothly from 0.85 to 100.0 at max zoom
        }

        if (sz < 1500) {
          rhombusScale = 0.85;
          rhombusOpacity = 0;
          borderProgress = 0;
          textOpacity = 0;
          dotOpacity = 0;
          pFill = 0;
        } else if (sz >= 1500 && sz < 2300) {
          // Step 1: Slow Border Reveal (800 units!)
          const pAppear = (sz - 1500) / 800;
          rhombusOpacity = Math.min(1.0, pAppear * 2.0);
          borderProgress = pAppear;
          textOpacity = 0;
          dotOpacity = 0;
          pFill = 0;
        } else if (sz >= 2300 && sz < 2500) {
          // Step 2: Fill & Color Morph (Border is complete, dark polygon fill fades in, text begins appearing)
          rhombusOpacity = 1.0;
          borderProgress = 1.0;
          pFill = (sz - 2300) / 200;
          textOpacity = pFill;
          dotOpacity = 0;
        } else if (sz >= 2500 && sz < 4000) {
          // Step 3: Text Sanctuary Reveal (Within the dark filled space - text stays fully visible!)
          rhombusOpacity = 1.0;
          borderProgress = 1.0;
          pFill = 1.0;
          textOpacity = 1.0;
          dotOpacity = 0;
        } else {
          // Step 4: Deep Zoom into Forgetful Place / Silent Space
          rhombusOpacity = 1.0;
          borderProgress = 1.0;
          pFill = 1.0;
          
          // Text stays fully present during zoom, then gently fades out after sz passes 4000
          textOpacity = Math.max(0, 1.0 - (sz - 4000) / 120);

          // Central emitting dot appears smoothly ONLY after the text is fully faded out
          dotOpacity = sz >= 4120 ? Math.min(1.0, (sz - 4120) / 80) : 0;
        }

        currentRhombusScale = rhombusScale;
        currentPFill = pFill;

        // Centered scale without translate offset
        rhombusContainerRef.current.style.transform = `scale(${rhombusScale})`;
        rhombusContainerRef.current.style.opacity = String(rhombusOpacity);
        rhombusContainerRef.current.style.pointerEvents = sz >= 1600 ? 'auto' : 'none';

        const rhombusFillEl = rhombusContainerRef.current.querySelector('#rhombus-fill');
        if (rhombusFillEl) {
          if (pFill > 0) {
            rhombusFillEl.setAttribute('fill', `rgba(8, 12, 22, ${pFill})`);
          } else {
            rhombusFillEl.setAttribute('fill', 'none');
          }
        }

        const borderPaths = rhombusContainerRef.current.querySelectorAll('.rhombus-border-path');
        if (borderPaths) {
          const len = 140;

          // Color transition for the inner borders: from dark neutral to light neutral when filled
          const pColor = pFill;
          const innerR = Math.round(41 + pColor * 209);
          const innerG = Math.round(37 + pColor * 212);
          const innerB = Math.round(36 + pColor * 209);
          const strokeColorInner = `rgb(${innerR}, ${innerG}, ${innerB})`;

          // Outer border is drawn only on the light off-white background, so it MUST stay dark neutral to always be visible
          const strokeColorOuter = 'rgb(41, 37, 36)';

          // Calculate zoom-out fade for borders as we zoom inside the rhombus
          const pZoomFade = sz >= 3000 ? Math.max(0, Math.min(1.0, (sz - 3000) / 1200)) : 0;

          borderPaths.forEach((path) => {
            const isInner = path.classList.contains('opacity-80');
            
            if (isInner) {
              // Inner border: continuous line drawing dynamically drawing from 0% to 100%
              (path as HTMLElement).style.strokeDasharray = String(len);
              (path as HTMLElement).style.strokeDashoffset = String(len * (1 - borderProgress));
              (path as HTMLElement).setAttribute('stroke', strokeColorInner);
              (path as HTMLElement).style.opacity = String(0.8 * (1.0 - pZoomFade));
            } else {
              // Outer border: continuous line drawing that never stops drawing during zoom and never completes (maxes out at 92%)
              const pOuter = sz >= 1500 ? Math.max(0, Math.min(1.0, (sz - 1500) / 2700)) : 0;
              const outerFrac = Math.pow(pOuter, 0.5) * 0.92;
              const outerOffset = len * (1.0 - outerFrac);
              (path as HTMLElement).style.strokeDasharray = String(len);
              (path as HTMLElement).style.strokeDashoffset = String(outerOffset);
              (path as HTMLElement).setAttribute('stroke', strokeColorOuter);
              (path as HTMLElement).style.opacity = String(1.0 - pZoomFade);
            }
          });
        }

        if (textRef.current) {
          textRef.current.style.opacity = String(textOpacity);
          // Zoom normalization: counteract the parent container's scaling factor to keep text at a fixed size
          // but allow a very tiny amount of scale depth (10%) to give a subtle, premium parallax depth feeling!
          // We combine translate(-50%, -50%) with scale to keep it perfectly centered without layout-flow sway.
          const textVisualScale = 1.0 + pZoom * 0.10;
          const normalizedTextScale = textVisualScale / rhombusScale;
          textRef.current.style.transform = `translate(-50%, -50%) scale(${normalizedTextScale})`;
        }

        if (emittingDotRef.current) {
          emittingDotRef.current.style.opacity = String(dotOpacity * (1 - contentFadeRef.current));
          // Counteract the container scale so the central emitting dot stays exactly the same size on screen.
          // The pan translate is applied inside a container scaled by rhombusScale, so the offset must be
          // divided by that scale to move the dot by the same on-screen pixels as the constellation.
          const dotScale = 1.0 / rhombusScale;
          emittingDotRef.current.style.transform = `translate(calc(-50% + ${panRef.current.x / rhombusScale}px), calc(-50% + ${panRef.current.y / rhombusScale}px)) scale(${dotScale})`;
        }
      }

      // 3. Direct DOM Parallax & 3D Spatial Zoom Updates: Update all active quote transforms in raw JS.
      // This completely bypasses expensive React render cycles and solves any CSS calc() browser glitches,
      // creating an incredibly smooth, buttery 3D depth feeling.
      const quoteEls = document.querySelectorAll('.parallax-quote');
      quoteEls.forEach((el) => {
        const depth = parseFloat(el.getAttribute('data-depth') || '1.0');
        const scale = parseFloat(el.getAttribute('data-scale') || '1.0');
        
        // Multiply by depth to scale translation speed: foreground drifts faster, background drifts slower
        const dx = parallax.x * depth;
        const dy = parallax.y * depth;
        
        // Base starting Z depth: depth 1.6 starts at 0px, depth 0.4 starts at -480px
        const zStart = (depth - 1.6) * 400;
        
        // As sz increases (scrolling up/zoom-in), dz moves forward
        const dz = zStart + sz * (depth * 1.1);
        
        // Apply true 3D spatial perspective transform for maximum immersion
        (el as HTMLElement).style.transform = `perspective(1000px) translate3d(${dx}px, ${dy}px, ${dz}px) scale(${scale})`;
        
        // Smooth fade out as it flies close and past the camera plane, multiplied by (1 - pQuotes) to dissolve into deep space
        let opacity = 0.95 * (1 - pQuotes);
        if (dz > 180) {
          opacity = Math.max(0, 0.95 * (1 - pQuotes) - (dz - 180) / 320);
        }
        (el as HTMLElement).style.opacity = opacity.toString();
        
        // Delicate depth-of-field blur as items get extremely close
        if (dz > 120) {
          const blurVal = Math.min(8, (dz - 120) * 0.02);
          (el as HTMLElement).style.filter = `blur(${blurVal}px)`;
        } else {
          (el as HTMLElement).style.filter = 'blur(0px)';
        }
        
        // Keep invisible elements click-safe
        if (opacity <= 0.05) {
          (el as HTMLElement).style.pointerEvents = 'none';
        } else {
          (el as HTMLElement).style.pointerEvents = 'auto';
        }
      });

      // About lines — pure sequential segments with quote-style spatial zoom
      if (phaseRef.current === 'about') {
        const lineCount = aboutLinesRef.current.length;
        const ABOUT_RANGE = 2400;
        const segSize = ABOUT_RANGE / lineCount;
        const aboutLineEls = document.querySelectorAll('.about-line');
        const sz = scrollZRef.current;

        if (scrollInstructionRef.current) {
          // Fade out linearly between -2800 and -2500
          let instOp = 1 - (sz - (-2800)) / 300;
          scrollInstructionRef.current.style.opacity = Math.max(0, Math.min(1, instOp)).toString();
          scrollInstructionRef.current.style.transform = `translate(-50%, -50%) translate3d(0, ${-(sz - -2800) * 0.15}px, 0)`;
        }
        
        aboutLineEls.forEach((el) => {
          const idx = parseInt(el.getAttribute('data-idx') || '0');
          const line = aboutLinesRef.current[idx];
          if (!line) return;

          const segStart = -ABOUT_RANGE + idx * segSize;
          const segProgress = Math.max(0, Math.min(1, (sz - segStart) / segSize));

          // Opacity: fade in (25%), hold (50%), fade out (25%) — no overlap between lines
          let opacity = 0;
          if (segProgress < 0.25) {
            opacity = 0.95 * (segProgress / 0.25);
          } else if (segProgress < 0.75) {
            opacity = 0.95;
          } else {
            opacity = 0.95 * ((1 - segProgress) / 0.25);
          }

          // Exact same spatial zoom as quotes: dz passes through camera at segment center
          const dz = (segProgress - 0.5) * 400;
          const dx = parallax.x * line.depth;
          const dy = parallax.y * line.depth;

          // Same blur logic as quotes
          const blur = dz > 120 ? Math.min(8, (dz - 120) * 0.02) : 0;

          (el as HTMLElement).style.transform = `translate(-50%, -50%) perspective(1000px) translate3d(${dx}px, ${dy}px, ${dz}px) scale(1)`;
          (el as HTMLElement).style.opacity = String(opacity);
          (el as HTMLElement).style.pointerEvents = 'none';
          (el as HTMLElement).style.filter = `blur(${blur}px)`;
        });
      }

      // Set aboutComplete when last line's segment ends, hide on scroll back to start
      if (phaseRef.current === 'about') {
        if (sz >= 30 && !aboutCompleteRef.current) {
          aboutCompleteRef.current = true;
          setAboutComplete(true);
        } else if (sz < 0 && aboutCompleteRef.current) {
          aboutCompleteRef.current = false;
          setAboutComplete(false);
        }
      }

      // Zoom out in alley → transition back to about phase
      if (phaseRef.current === 'alley' && sz < -50) {
        phaseRef.current = 'about';
        setPhase('about');
        setActiveQuotes([]);
        setFinishedQuotesCount(0);
        setAboutComplete(true);
      }

      // Clear main canvas for redraw
      ctx.clearRect(0, 0, width, height);

      // 4. Draw shifting film grain overlay
      const offsetX = Math.floor(Math.random() * 128);
      const offsetY = Math.floor(Math.random() * 128);

      ctx.globalAlpha = 0.16 - pZoom * 0.08; // soft vintage grain density, slightly softer in dark theme
      for (let x = -128; x < width + 128; x += 128) {
        for (let y = -128; y < height + 128; y += 128) {
          ctx.drawImage(noiseCanvas, x + (offsetX % 8), y + (offsetY % 8));
        }
      }
      ctx.globalAlpha = 1.0;

      // 5. Destination-Out Compositing: Clear grain inside circular spotlight around the mouse
      ctx.globalCompositeOperation = 'destination-out';

      // Inner 30px is fully cleared, smoothly feathers out to 250px radius
      const clearRadius = 250;
      const grad = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        30,
        mouse.x,
        mouse.y,
        clearRadius
      );
      grad.addColorStop(0, 'rgba(0,0,0,1.0)'); // completely clear grain
      grad.addColorStop(0.2, 'rgba(0,0,0,0.9)'); // very clean inner window
      grad.addColorStop(0.5, 'rgba(0,0,0,0.4)'); // smooth feather
      grad.addColorStop(1, 'rgba(0,0,0,0.0)'); // keep background grain

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, clearRadius, 0, Math.PI * 2);
      ctx.fill();

      // Reset composite mode
      ctx.globalCompositeOperation = 'source-over';

      // 6. Draw very subtle warm backlight halo under the cleared circular window
      ctx.globalCompositeOperation = 'destination-over';

      // Define standard light/warm glow gradient (Alley style, or everywhere if currentPFill is 0)
      const glowGradLight = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        20,
        mouse.x,
        mouse.y,
        clearRadius
      );
      // Soft warm off-white glow
      glowGradLight.addColorStop(0, 'rgba(255, 252, 238, 0.45)');
      glowGradLight.addColorStop(0.5, 'rgba(255, 252, 238, 0.15)');
      glowGradLight.addColorStop(1, 'rgba(255, 252, 238, 0.0)');

      // Soft mysterious light-blue/indigo glow for the dark filled space (fades out as core aspects appear)
      const glowGradDark = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        20,
        mouse.x,
        mouse.y,
        clearRadius
      );
      const cursorGlowOpacityFactor = 1.0 - idleProgress;
      glowGradDark.addColorStop(0, `rgba(165, 180, 252, ${0.04 * cursorGlowOpacityFactor})`);
      glowGradDark.addColorStop(0.5, `rgba(165, 180, 252, ${0.008 * cursorGlowOpacityFactor})`);
      glowGradDark.addColorStop(1, 'rgba(165, 180, 252, 0.0)');

      if (currentPFill > 0) {
        const cx = width / 2;
        const cy = height / 2;
        const halfSize = 157.5 * currentRhombusScale;

        // --- DRAW LIGHT GLOW OUTSIDE THE RHOMBUS (using robust non-zero winding clip) ---
        ctx.save();
        ctx.beginPath();
        // Outer boundary (clockwise)
        ctx.moveTo(0, 0);
        ctx.lineTo(width, 0);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        // Inner rhombus (counter-clockwise)
        ctx.moveTo(cx, cy - halfSize);
        ctx.lineTo(cx - halfSize, cy);
        ctx.lineTo(cx, cy + halfSize);
        ctx.lineTo(cx + halfSize, cy);
        ctx.closePath();
        ctx.clip();

        ctx.fillStyle = glowGradLight;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, clearRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // --- DRAW DARK GLOW INSIDE THE RHOMBUS ---
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy - halfSize);
        ctx.lineTo(cx + halfSize, cy);
        ctx.lineTo(cx, cy + halfSize);
        ctx.lineTo(cx - halfSize, cy);
        ctx.closePath();
        ctx.clip();

        ctx.fillStyle = glowGradDark;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, clearRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // No filled rhombus, draw light glow everywhere
        ctx.fillStyle = glowGradLight;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, clearRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. Draw custom cursor dot on top of everything
      ctx.globalCompositeOperation = 'source-over';

      // --- PHASE 3 - MEMORIES: Interactive constellation knowledge graph reveal ---
      if (emittingDotRef.current) {
        // Control emitting halos based on idleProgress
        const halos = emittingDotRef.current.querySelectorAll('.rounded-full');
        halos.forEach((halo) => {
          const isHalo = halo.classList.contains('border') || halo.classList.contains('animate-ping') || halo.classList.contains('animate-pulse');
          if (isHalo) {
            (halo as HTMLElement).style.opacity = String((1.0 - idleProgress) * 0.4); // Scale down based on idleProgress
          }
        });
      }

      if (idleProgress > 0.01) {
        const centerX = width / 2 + panRef.current.x;
        const centerY = height / 2 + panRef.current.y;

        const t = Date.now() * 0.0006;
        const floatAmp = 8; // gentle float amplitude

        const scaleFactor = Math.max(0.85, Math.min(1.3, Math.min(width, height) / 680));
        const offsetA_X = -150 * scaleFactor;
        const offsetA_Y = -150 * scaleFactor;
        const offsetB_X = 175 * scaleFactor;
        const offsetB_Y = -40 * scaleFactor;
        const offsetC_X = -15 * scaleFactor;
        const offsetC_Y = 170 * scaleFactor;

        const nodeA = {
          id: 'interests',
          label: 'INTERESTS',
          details: 'Creativity  •  Design  •  Music  •  Automation',
          x: centerX + offsetA_X + Math.sin(t + 1.0) * floatAmp,
          y: centerY + offsetA_Y + Math.cos(t + 1.5) * floatAmp,
          labelYOffset: -20,
          detailsYOffset: -36,
          align: 'center' as const
        };

        const nodeB = {
          id: 'knowledge',
          label: 'KNOWLEDGE',
          details: 'AutoCAD  •  Software Development  •  AI automation',
          x: centerX + offsetB_X + Math.sin(t + 2.5) * floatAmp,
          y: centerY + offsetB_Y + Math.cos(t + 3.0) * floatAmp,
          labelYOffset: -20,
          detailsYOffset: -36,
          align: 'center' as const
        };

        const nodeC = {
          id: 'goal',
          label: 'GOAL',
          details: 'Dohickey Engineer  •  Endless search of Opportunities',
          x: centerX + offsetC_X + Math.sin(t + 4.0) * floatAmp,
          y: centerY + offsetC_Y + Math.cos(t + 4.5) * floatAmp,
          labelYOffset: 24,
          detailsYOffset: 40,
          align: 'center' as const
        };

        const nodes = [nodeA, nodeB, nodeC];

        // 1. Calculate distances from mouse to determine glows and hover effects
        const distA = Math.sqrt(Math.pow(mouse.x - nodeA.x, 2) + Math.pow(mouse.y - nodeA.y, 2));
        const distB = Math.sqrt(Math.pow(mouse.x - nodeB.x, 2) + Math.pow(mouse.y - nodeB.y, 2));
        const distC = Math.sqrt(Math.pow(mouse.x - nodeC.x, 2) + Math.pow(mouse.y - nodeC.y, 2));
        const minDist = Math.min(distA, distB, distC);

        const maxDist = 360;
        const baseGlowA = Math.max(0, 1 - distA / maxDist);
        const baseGlowB = Math.max(0, 1 - distB / maxDist);
        const baseGlowC = Math.max(0, 1 - distC / maxDist);

        const isA_Closest = minDist === distA;
        const isB_Closest = minDist === distB;
        const isC_Closest = minDist === distC;

        const glowA = Math.pow(baseGlowA, 1.5) * (isA_Closest ? 1.0 : 0.4);
        const glowB = Math.pow(baseGlowB, 1.5) * (isB_Closest ? 1.0 : 0.4);
        const glowC = Math.pow(baseGlowC, 1.5) * (isC_Closest ? 1.0 : 0.4);

        const glowFactors = { interests: glowA, knowledge: glowB, goal: glowC };

        // Track peak idleProgress so node reveals lock at max reached
        peakIdleProgressRef.current = Math.max(peakIdleProgressRef.current, idleProgress);
        const peakIdle = peakIdleProgressRef.current;

        // Per-node reveals based on peak (locked — never decrease during fade-out)
        const nodeReveal = {
          interests: Math.max(0, Math.min(1, (peakIdle - 0.0) / 0.50)),
          knowledge: Math.max(0, Math.min(1, (peakIdle - 0.35) / 0.40)),
          goal: Math.max(0, Math.min(1, (peakIdle - 0.60) / 0.30)),
        };

        // Shared global fade — same for ALL elements (controls fade-out consistently).
        // Multiplied by (1 - contentFade) so everything dissolves while a memory opens.
        const globalFade = Math.max(0, Math.min(1, idleProgress / 0.50)) * (1 - contentFadeRef.current);

        // Node opacity = min(locked reveal, global fade)
        const nodeProgress = {
          interests: Math.min(nodeReveal.interests, globalFade),
          knowledge: Math.min(nodeReveal.knowledge, globalFade),
          goal: Math.min(nodeReveal.goal, globalFade),
        };

        // Cross-links: fade in after all nodes fully revealed, fade out with globalFade
        const allNodesFullyRevealed = nodeReveal.interests >= 1 && nodeReveal.knowledge >= 1 && nodeReveal.goal >= 1;
        const crossFadeIn = Math.max(0, Math.min(1, (idleProgress - 0.90) / 0.10));

        // 2. Draw connection lines (constellation lines drawing themselves)
        ctx.save();
        ctx.strokeStyle = `rgba(250, 249, 245, 0.12)`;
        ctx.lineWidth = 1.0;
        ctx.setLineDash([4, 4]);

        const drawLine = (x1: number, y1: number, x2: number, y2: number, frac: number) => {
          if (frac <= 0) return;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 + (x2 - x1) * frac, y1 + (y2 - y1) * frac);
          ctx.stroke();
        };

        // Draw center-to-node connections as each node reveals
        drawLine(centerX, centerY, nodeA.x, nodeA.y, nodeProgress.interests);
        drawLine(centerX, centerY, nodeB.x, nodeB.y, nodeProgress.knowledge);
        drawLine(centerX, centerY, nodeC.x, nodeC.y, nodeProgress.goal);

        // Cross-links fade in after all nodes revealed, fade out with globalFade
        if (allNodesFullyRevealed) {
          const crossFrac = Math.min(crossFadeIn, globalFade);
          drawLine(nodeA.x, nodeA.y, nodeB.x, nodeB.y, crossFrac);
          drawLine(nodeB.x, nodeB.y, nodeC.x, nodeC.y, crossFrac);
          drawLine(nodeC.x, nodeC.y, nodeA.x, nodeA.y, crossFrac);
        }

        ctx.restore();

        // 3. Draw nodes, labels, glows, and sub-details
        nodes.forEach((node) => {
          const factor = glowFactors[node.id as 'interests' | 'knowledge' | 'goal'];
          const nodeOpacity = nodeProgress[node.id as 'interests' | 'knowledge' | 'goal'];

          // Draw glowing halo around node
          if (factor > 0) {
            ctx.save();
            const radius = 72 * factor;
            const radGrad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius);
            // Even dimmer glow for the nodes in dark bg, matching the user's request
            radGrad.addColorStop(0, `rgba(165, 180, 252, ${0.18 * factor * nodeOpacity})`);
            radGrad.addColorStop(0.5, `rgba(165, 180, 252, ${0.05 * factor * nodeOpacity})`);
            radGrad.addColorStop(1, 'rgba(165, 180, 252, 0.0)');
            ctx.fillStyle = radGrad;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // Draw the physical dot
          ctx.save();
          // Subtle pulsation for the dot
          const pulse = 1.0 + Math.sin(Date.now() * 0.003 + (node.id === 'interests' ? 0 : node.id === 'knowledge' ? 2 : 4)) * 0.15;
          ctx.fillStyle = `rgba(250, 249, 245, ${0.85 * nodeOpacity})`;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 3.5 * pulse, 0, Math.PI * 2);
          ctx.fill();

          // Stroke ring
          ctx.strokeStyle = `rgba(250, 249, 245, ${0.3 * nodeOpacity})`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 7 * pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Draw main label (INTERESTS, KNOWLEDGE, GOAL)
          ctx.save();
          ctx.fillStyle = `rgba(250, 249, 245, ${0.75 * nodeOpacity})`;
          ctx.font = '12px "Inter", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // Add spacing to characters for high-end cinematic tracking
          const spacedLabel = node.label.split('').join(' ');
          ctx.fillText(spacedLabel, node.x, node.y + node.labelYOffset);
          ctx.restore();

          // Draw sub-details if the mouse is close (smoothly faded in)
           const detailOpacity = factor * nodeOpacity;
          if (detailOpacity > 0.01) {
            ctx.save();
            ctx.fillStyle = `rgba(250, 249, 245, ${0.5 * detailOpacity})`;
            ctx.font = '11px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.details, node.x, node.y + node.detailsYOffset);
            ctx.restore();
          }
        });

        // --- 4. Interactive memory sub-tree reveal + dwell-to-content ---
        const now = Date.now();

        // Clear the memory if the user scrolls back out of the silent space
        if (idleProgress < 0.05 && activeLeafRef.current) {
          activeLeafRef.current = null;
          activeLeafPosRef.current = null;
          setActiveContent(null);
          setActiveContentTag(null);
          contentFadeRef.current = 0;
          contentExitingRef.current = false;
        }
        if (idleProgress < 0.05 && revealClusterRef.current) {
          revealClusterRef.current = null;
          revealGroupRef.current = null;
          prevActiveClusterRef.current = null;
          prevActiveGroupRef.current = null;
        }

        // Content overlay state machine (always runs so it can fade out)
        let cf = contentFadeRef.current;
        if (activeLeafRef.current) {
          if (contentExitingRef.current) {
            cf = Math.max(0, cf - 0.012);
            if (cf <= 0) {
              activeLeafRef.current = null;
              activeLeafPosRef.current = null;
              setActiveContent(null);
              setActiveContentTag(null);
              contentExitingRef.current = false;
              dwellStartRef.current = now;
            }
          } else {
            cf = Math.min(1, cf + 0.03);
          }
        }
        contentFadeRef.current = cf;
        if (cf > 0) {
          const contentEl = document.getElementById('memory-content-overlay');
          if (contentEl) contentEl.style.opacity = String(cf);
        }

        const memFade = 1 - cf;
        if (memFade > 0.01) {
          memoryNodesRef.current = [];

          // Splay helper: spread child index across a symmetric angular range
          const childSplay = (index: number, count: number, spread: number) => {
            if (count <= 1) return 0;
            return -spread / 2 + (spread * index) / (count - 1);
          };

          const clusterMap = new Map<string, { node: (typeof nodes)[number]; cluster: MemoryCluster }>();
          nodes.forEach((n) => {
            const cluster = memoryClustersRef.current.find((c) => c.id === n.id);
            if (cluster) clusterMap.set(n.id, { node: n, cluster });
          });

          // Which main node the mouse is nearest to
          let hoveredClusterId: string | null = null;
          let hoveredClusterDist = Infinity;
          nodes.forEach((n) => {
            const d = Math.hypot(mouse.x - n.x, mouse.y - n.y);
            if (d < 72 && d < hoveredClusterDist) {
              hoveredClusterId = n.id;
              hoveredClusterDist = d;
            }
          });
          hoveredClusterRef.current = hoveredClusterId;
          nodeHoverRef.current = hoveredClusterId !== null;

          // Sticky sub-node reveal: hovering a main node keeps its sub-nodes visible
          // while the cursor travels toward them. Collapses on click, or when the
          // cursor drifts to the screen center or the very edge of the screen
          // (checked after node hover detection, below).
          if (hoveredClusterId) {
            if (revealClusterRef.current !== hoveredClusterId) revealGroupRef.current = null;
            revealClusterRef.current = hoveredClusterId;
          }
          // Per-cluster reveal progress: each cluster animates from 0 on its own
          // with the same slow, self-drawing timing as the main nodes.
          if (revealClusterRef.current && revealClusterRef.current !== prevActiveClusterRef.current) {
            clusterRevealRef.current[revealClusterRef.current] = 0;
          }
          prevActiveClusterRef.current = revealClusterRef.current;
          for (const c of memoryClustersRef.current) {
            const target = c.id === revealClusterRef.current ? 1 : 0;
            const prev = clusterRevealRef.current[c.id] ?? 0;
            clusterRevealRef.current[c.id] = prev + (target - prev) * (target > prev ? 0.03 : 0.06);
          }

          // Per-group leaf reveal progress: each group's leaves animate from 0 on its own
          if (revealGroupRef.current && revealGroupRef.current !== prevActiveGroupRef.current) {
            groupRevealRef.current[revealGroupRef.current] = 0;
          }
          prevActiveGroupRef.current = revealGroupRef.current;
          for (const c of memoryClustersRef.current) {
            for (const child of c.children) {
              if (child.kind !== 'group') continue;
              const target = child.id === revealGroupRef.current ? 1 : 0;
              const prev = groupRevealRef.current[child.id] ?? 0;
              groupRevealRef.current[child.id] = prev + (target - prev) * (target > prev ? 0.03 : 0.06);
            }
          }

          const activeClusterId = revealClusterRef.current;
          let minMouseNodeDist = Infinity;
          if (activeClusterId && clusterMap.has(activeClusterId)) {
            const { node: parentNode, cluster } = clusterMap.get(activeClusterId)!;
            const baseAngle = Math.atan2(parentNode.y - centerY, parentNode.x - centerX);
            const spread = Math.min(190, Math.max(85, cluster.children.length * 40));

            cluster.children.forEach((child, i) => {
              const ang = baseAngle + (childSplay(i, cluster.children.length, spread) * Math.PI) / 180;
              const childX = parentNode.x + Math.cos(ang) * 158 * scaleFactor;
              const childY = parentNode.y + Math.sin(ang) * 158 * scaleFactor;
              const childMouseDist = Math.hypot(mouse.x - childX, mouse.y - childY);
              if (childMouseDist < minMouseNodeDist) minMouseNodeDist = childMouseDist;
              const reveal = nodeProgress[cluster.id] * (clusterRevealRef.current[cluster.id] ?? 0);
              if (reveal <= 0.01) return;

              // Nodes reveal first, then their connecting line draws out to join them
              const childLine = Math.max(0, (reveal - 0.55) / 0.45);

              const childHover = Math.hypot(mouse.x - childX, mouse.y - childY);
              const isHover = childHover < 26;
              if (isHover) {
                isHoveringRef.current = true;
                nodeHoverRef.current = true;
              }

              // Parent-to-child constellation line (draws out after the node reveals)
              if (childLine > 0.01) {
                ctx.save();
                ctx.strokeStyle = `rgba(250, 249, 245, ${0.10 * childLine})`;
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 4]);
                ctx.beginPath();
                ctx.moveTo(parentNode.x, parentNode.y);
                ctx.lineTo(parentNode.x + (childX - parentNode.x) * childLine, parentNode.y + (childY - parentNode.y) * childLine);
                ctx.stroke();
                ctx.restore();
              }

              // Child dot + ring (reveals first, then the line joins it)
              ctx.save();
              const childPulse = 1.0 + Math.sin(Date.now() * 0.003 + i) * 0.15;
              ctx.fillStyle = `rgba(250, 249, 245, ${0.8 * reveal})`;
              ctx.beginPath();
              ctx.arc(childX, childY, 3.5 * childPulse, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = `rgba(250, 249, 245, ${0.3 * reveal})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(childX, childY, 7 * childPulse, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();

              // Child label (fades in with the dot)
              ctx.save();
              ctx.fillStyle = `rgba(250, 249, 245, ${(isHover ? 0.9 : 0.6) * reveal})`;
              ctx.font = '11px "JetBrains Mono", monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(child.label.toUpperCase(), childX, childY + 20);
              if (isHover && child.kind === 'group' && child.detail) {
                ctx.fillStyle = `rgba(250, 249, 245, ${0.4 * reveal})`;
                ctx.font = '10px "JetBrains Mono", monospace';
                ctx.fillText(child.detail.toUpperCase(), childX, childY + 31);
              }
              ctx.restore();

              if (child.kind === 'group') {
                memoryNodesRef.current.push({ id: child.id, kind: 'group', x: childX, y: childY, r: 26 });

                // Reveal the group's leaf headers when the group is hovered (sticky too)
                if (isHover) revealGroupRef.current = child.id;
                if (revealGroupRef.current === child.id) {
                  const leafSpread = Math.min(230, Math.max(110, child.children.length * 38));
                  const leafBase = Math.atan2(childY - centerY, childX - centerX);
                  child.children.forEach((leaf, j) => {
                    const lAng = leafBase + (childSplay(j, child.children.length, leafSpread) * Math.PI) / 180;
                    // Alternate ring radii so dense groups read clearly
                    const lRadius = (j % 2 === 0 ? 178 : 206) * scaleFactor;
                    const lx = childX + Math.cos(lAng) * lRadius;
                    const ly = childY + Math.sin(lAng) * lRadius;
                    const leafMouseDist = Math.hypot(mouse.x - lx, mouse.y - ly);
                    if (leafMouseDist < minMouseNodeDist) minMouseNodeDist = leafMouseDist;
                    const lReveal = reveal * (groupRevealRef.current[child.id] ?? 0);
                    if (lReveal <= 0.01) return;

                    // Leaves reveal first, then their connecting line draws out to join them
                    const lLineReveal = Math.max(0, (lReveal - 0.55) / 0.45);

                    const lHover = Math.hypot(mouse.x - lx, mouse.y - ly);
                    const lIsHover = lHover < 24;
                    if (lIsHover) {
                      isHoveringRef.current = true;
                      nodeHoverRef.current = true;
                    }

                    // Group-to-leaf constellation line (draws out after the leaf reveals)
                    ctx.save();
                    ctx.strokeStyle = `rgba(250, 249, 245, ${0.08 * lLineReveal})`;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([2, 4]);
                    ctx.beginPath();
                    ctx.moveTo(childX, childY);
                    ctx.lineTo(childX + (lx - childX) * lLineReveal, childY + (ly - childY) * lLineReveal);
                    ctx.stroke();
                    ctx.restore();

                    // Leaf dot (reveals first, then the line joins it)
                    ctx.save();
                    const lPulse = 1.0 + Math.sin(Date.now() * 0.003 + j * 1.7) * 0.15;
                    ctx.fillStyle = `rgba(250, 249, 245, ${0.7 * lReveal})`;
                    ctx.beginPath();
                    ctx.arc(lx, ly, 2.5 * lPulse, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = `rgba(250, 249, 245, ${0.26 * lReveal})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(lx, ly, 5.5 * lPulse, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();

                    // Leaf label (fades in with the dot)
                    ctx.save();
                    ctx.fillStyle = `rgba(250, 249, 245, ${(lIsHover ? 0.9 : 0.55) * lReveal})`;
                    ctx.font = '10px "JetBrains Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(leaf.label.toUpperCase(), lx, ly + 16);
                    ctx.restore();

                    memoryNodesRef.current.push({ id: leaf.id, kind: 'leaf', x: lx, y: ly, r: 24 });

                    // Hover only brightens the label — content opens on click
                    if (lIsHover) {
                      hoveredLeafRef.current = leaf.id;
                    } else if (hoveredLeafRef.current === leaf.id) {
                      hoveredLeafRef.current = null;
                    }
                  });
                }
              } else {
                memoryNodesRef.current.push({ id: child.id, kind: 'leaf', x: childX, y: childY, r: 24 });
                // Hover only brightens the label — content opens on click
                if (isHover) {
                  hoveredLeafRef.current = child.id;
                } else if (hoveredLeafRef.current === child.id) {
                  hoveredLeafRef.current = null;
                }
              }
            });
          } else {
            hoveredLeafRef.current = null;
          }

          // Collapse expanded nodes when the cursor drifts to the constellation's own
          // center or the top/left/right edges of the screen — but never while it is
          // still over a node or an interactive element. The center follows the pan so
          // repositioning the endless canvas never triggers a fade at the screen center,
          // and the bottom edge is excluded entirely so bottom content never collapses it.
          if (revealClusterRef.current && !nodeHoverRef.current && !isHoveringRef.current) {
            const edgeMargin = 70;
            // The center dead-zone is context-aware: instead of a fixed radius, it only
            // collapses while the cursor sits in genuinely empty space near the constellation
            // center. The zone shrinks to just inside the cursor's own clearance from the
            // active tree (hover reach + margin), so heading toward any node never trips a
            // collapse before the node's own hover guard engages — regardless of tree depth.
            const hoverReach = 30;
            const centerRadius = Math.max(0, Math.min(140 * scaleFactor, minMouseNodeDist - hoverReach));
            const atCenter = Math.hypot(mouse.x - centerX, mouse.y - centerY) < centerRadius;
            const atEdge = mouse.x < edgeMargin || mouse.x > width - edgeMargin ||
                           mouse.y < edgeMargin;
            if (atCenter || atEdge) {
              revealClusterRef.current = null;
              revealGroupRef.current = null;
            }
          }
        } else {
          memoryNodesRef.current = [];
        }
      }

      // Custom cursor dot (always visible, even while memory content is showing)
      if (!hasStartedRef.current) {
        // --- START OVERLAY CURSOR ---
        if (isHoveringRef.current) {
          // Hovering over the dark button: draw elegant light dot with dark stone stroke
          ctx.save();
          ctx.fillStyle = 'rgb(250, 249, 245)';
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgb(28, 25, 23)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();
        } else {
          // Idle on light background: draw sharp solid dark stone dot (no stroke to prevent fuzziness)
          ctx.save();
          ctx.fillStyle = 'rgb(28, 25, 23)';
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else if (currentPFill > 0) {
        const cx = width / 2;
        const cy = height / 2;
        const halfSize = 157.5 * currentRhombusScale;

        // --- CURSOR OUTSIDE: Dark neutral fill with light stroke ---
        ctx.save();
        ctx.beginPath();
        // Outer boundary (clockwise)
        ctx.moveTo(0, 0);
        ctx.lineTo(width, 0);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        // Inner rhombus (counter-clockwise)
        ctx.moveTo(cx, cy - halfSize);
        ctx.lineTo(cx - halfSize, cy);
        ctx.lineTo(cx, cy + halfSize);
        ctx.lineTo(cx + halfSize, cy);
        ctx.closePath();
        ctx.clip();

        if (isHoveringRef.current) {
          ctx.fillStyle = 'rgb(250, 249, 245)';
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgb(28, 25, 23)';
        } else {
          ctx.fillStyle = 'rgb(28, 25, 23)';
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgb(250, 249, 245)';
        }
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        // --- CURSOR INSIDE: Light neutral fill with dark stroke ---
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy - halfSize);
        ctx.lineTo(cx + halfSize, cy);
        ctx.lineTo(cx, cy + halfSize);
        ctx.lineTo(cx - halfSize, cy);
        ctx.closePath();
        ctx.clip();

        if (isHoveringRef.current) {
          ctx.fillStyle = 'rgb(28, 25, 23)';
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgb(250, 249, 245)';
        } else {
          ctx.fillStyle = 'rgb(250, 249, 245)';
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgb(28, 25, 23)';
        }
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      } else {
        // --- INSIDE EXPERIENCE BEFORE RHOMBUS IS FILLED ---
        ctx.save();
        if (panningRef.current) {
          // Middle-mouse pan: show a grab-style double-ring cursor
          const grabColor = isHoveringRef.current ? 'rgb(250, 249, 245)' : 'rgb(28, 25, 23)';
          ctx.strokeStyle = grabColor;
          ctx.fillStyle = grabColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 13, 0, Math.PI * 2);
          ctx.stroke();
        } else if (isHoveringRef.current) {
          ctx.fillStyle = 'rgb(250, 249, 245)';
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgb(28, 25, 23)';
        } else {
          ctx.fillStyle = 'rgb(28, 25, 23)';
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgb(250, 249, 245)';
        }
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }
      // Restore composite mode
      ctx.globalCompositeOperation = 'source-over';

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Update mouse coordinate targets for canvas spotlight & parallax offset
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const mx = e.clientX;
    const my = e.clientY;
    
    // Reset activity timers
    lastInteractionTimeRef.current = Date.now();
    lastMouseMoveRef.current = Date.now();
    
    // Canvas spotlight target
    mouseRef.current.targetX = mx;
    mouseRef.current.targetY = my;

    // Middle-mouse pan: drag repositions the memory constellation
    if (panningRef.current) {
      panTargetRef.current.x = panStartPanRef.current.x + (mx - panStartMouseRef.current.x);
      panTargetRef.current.y = panStartPanRef.current.y + (my - panStartMouseRef.current.y);
    }

    // Dynamically detect hover states on any interactive button/anchor under mouse cursor
    const target = e.target as HTMLElement;
    const isHovering = !!(
      target && (
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.closest('button') !== null ||
        target.closest('a') !== null ||
        window.getComputedStyle(target).cursor === 'pointer'
      )
    );
    isHoveringRef.current = isHovering;

    // Parallax displacement ratio relative to screen center (-1 to 1)
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const px = (mx - windowWidth / 2) / (windowWidth / 2);
    const py = (my - windowHeight / 2) / (windowHeight / 2);

    // Displace up to 18px dynamically based on mouse movement for high-quality subtle 3D movement amplitude
    parallaxRef.current.targetX = px * 18;
    parallaxRef.current.targetY = py * 18;
  };

  // Middle-mouse press begins panning the memory constellation
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 1) {
      e.preventDefault();
      panningRef.current = true;
      panStartMouseRef.current = { x: e.clientX, y: e.clientY };
      panStartPanRef.current = { x: panRef.current.x, y: panRef.current.y };
    }
  };

  // Middle-mouse release (and leave) ends panning
  const handleMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 1) {
      panningRef.current = false;
    }
  };

  const handleMouseLeave = () => {
    panningRef.current = false;
  };

  // Screen click handler for synthesized windchimes
  const handleScreenClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const cx = e.clientX;
    const cy = e.clientY;
    const xPercent = cx / window.innerWidth;
    const yPercent = cy / window.innerHeight;

     // Reset activity and idle timer on click
    lastInteractionTimeRef.current = Date.now();

    // Resume audio on any click (browsers require user gesture)
    audio.resume();

    // Any click collapses the sticky sub-node reveal back to the main nodes
    revealClusterRef.current = null;
    revealGroupRef.current = null;
    prevActiveClusterRef.current = null;
    prevActiveGroupRef.current = null;

    // Memory content: a click while content is open closes it; otherwise click a leaf to open
    if (activeLeafRef.current !== null) {
      contentExitingRef.current = true;
    } else {
      for (const hit of memoryNodesRef.current) {
        if (hit.kind !== 'leaf') continue;
        const d = Math.hypot(cx - hit.x, cy - hit.y);
        if (d < hit.r) {
          const leaf = memoryLeafMapRef.current[hit.id];
          if (leaf) {
            activeLeafRef.current = hit.id;
            activeLeafPosRef.current = { x: hit.x, y: hit.y };
            setActiveContent(leaf.content);
            setActiveContentTag(leafTagMapRef.current[hit.id] ?? null);
            contentFadeRef.current = 0;
            contentExitingRef.current = false;
            dwellStartRef.current = Date.now();
          }
          break;
        }
      }
    }

    // Synthesize beautiful windchimes at mapped frequencies using Z-spatial depth!
    const zPercent = Math.max(0, Math.min(1, scrollZRef.current / 4200));
    audio.playWindchimeClick(xPercent, yPercent, zPercent);

    // Create a physical click ripple expanding outwards
    const chimeColors = [
      'rgba(243, 225, 204, 0.55)', // soft apricot
      'rgba(230, 210, 220, 0.50)', // gentle blossom
      'rgba(210, 226, 236, 0.50)', // light ice chime
      'rgba(215, 232, 215, 0.50)', // subtle mint leaf
      'rgba(238, 238, 205, 0.55)', // retro gold linen
    ];
    const randomColor = chimeColors[Math.floor(Math.random() * chimeColors.length)];
    const newRipple: ChimeRipple = {
      id: Math.random().toString(),
      x: cx,
      y: cy,
      color: randomColor,
      maxRadius: 110 + Math.random() * 110,
    };

    setRipples((prev) => [...prev, newRipple]);

    // Clean up ripples after animation concludes
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 1500);
  };

  // Helper to generate a collision-free quote placement coordinates with a strict center deadzone
  // Now considers the Z-depth so that elements on the same depth layer never overlap, and allows beautiful layout
  const generateCleanPlacement = (existing: FloatingQuoteInstance[], targetDepth: number) => {
    let coordX = 0;
    let coordY = 0;
    let attempts = 0;
    let isValid = false;

    // We restrict ranges to keep items elegantly spaced on the viewport
    while (!isValid && attempts < 250) {
      attempts++;
      coordX = 10 + Math.random() * 60; // 10% to 70% left
      coordY = 12 + Math.random() * 56; // 12% to 68% top

      // 1. Check center deadzone constraint (X=50, Y=50) to prevent center overlay
      const distanceToCenter = Math.sqrt(Math.pow(coordX - 50, 2) + Math.pow(coordY - 50, 2));
      if (distanceToCenter < 24) {
        // Too close to center deadzone, retry
        continue;
      }

      // 2. Check overlap with existing active quotes considering their Z depth
      let hasOverlap = false;
      for (const item of existing) {
        const dx = Math.abs(item.x - coordX);
        const dy = Math.abs(item.y - coordY);
        const dz = Math.abs(item.depth - targetDepth);

        // If on the same Z axis/depth layer, they must absolutely never overlap
        if (dz < 0.1) {
          if (dx < 35 && dy < 20) {
            hasOverlap = true;
            break;
          }
        } else {
          // If on different Z depth planes, we still prevent direct stack-up (visual obstruction)
          // so the user can easily read everything as they zoom past.
          if (dx < 18 && dy < 12) {
            hasOverlap = true;
            break;
          }
        }
      }

      if (!hasOverlap) {
        isValid = true;
      }
    }

    // High-quality fallback if random attempts fail (highly unlikely for small pools of quotes)
    if (!isValid) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * 12;
      coordX = 50 + Math.cos(angle) * radius;
      coordY = 50 + Math.sin(angle) * radius;
    }

    return { x: coordX, y: coordY };
  };

  // Synchronize the triggerRefreshRef with the latest closures for infinite Alley replenishment
  useEffect(() => {
    triggerRefreshRef.current = () => {
      const deck = shuffledQuotesRef.current.length > 0 ? shuffledQuotesRef.current : [];
      const getNextQuote = (currentActive: FloatingQuoteInstance[]) => {
        if (deck.length === 0) return null;
        let selected = deck[quoteQueueIndexRef.current % deck.length];
        quoteQueueIndexRef.current++;

        let attempts = 0;
        while (currentActive.some(q => q.text === selected.text) && attempts < 10) {
          selected = deck[quoteQueueIndexRef.current % deck.length];
          quoteQueueIndexRef.current++;
          attempts++;
        }
        return selected;
      };

      setActiveQuotes(() => {
        const initialQuotes: FloatingQuoteInstance[] = [];
        const depthOptions = [0.4, 0.8, 1.2, 1.6];

        for (let i = 0; i < 4; i++) {
          const quote = getNextQuote(initialQuotes);
          if (!quote) continue;
          const depth = depthOptions[i % depthOptions.length];
          const pos = generateCleanPlacement(initialQuotes, depth);
          const computedScale = 0.7 + (depth * 0.35);

          initialQuotes.push({
            id: Math.random().toString(),
            text: quote.text,
            x: pos.x,
            y: pos.y,
            rotation: 0,
            scale: computedScale,
            depth: depth,
            fadeState: 'in',
            createdAt: Date.now() + i * 1500
          });
        }
        return initialQuotes;
      });
    };
  }, []);

  // 2. Randomized Scattered Quotes Generator
  useEffect(() => {
    if (phase !== 'alley') return;

    // Helper to pick a non-duplicate quote from the deck
    const getNextQuote = (currentActive: FloatingQuoteInstance[]) => {
      const deck = shuffledQuotesRef.current.length > 0 ? shuffledQuotesRef.current : [];
      if (deck.length === 0) return null;
      let selected = deck[quoteQueueIndexRef.current % deck.length];
      quoteQueueIndexRef.current++;

      // Try to avoid showing the exact same quote twice concurrently
      let attempts = 0;
      while (currentActive.some(q => q.text === selected.text) && attempts < 10) {
        selected = deck[quoteQueueIndexRef.current % deck.length];
        quoteQueueIndexRef.current++;
        attempts++;
      }
      return selected;
    };

    // Pre-populate the screen with 4 scattered quotes instantly when starting so that the board is full of starry thoughts
    setActiveQuotes(() => {
      const initialQuotes: FloatingQuoteInstance[] = [];
      const depthOptions = [0.4, 0.8, 1.2, 1.6];

      for (let i = 0; i < 4; i++) {
        const quote = getNextQuote(initialQuotes);
        const depth = depthOptions[i % depthOptions.length];
        const pos = generateCleanPlacement(initialQuotes, depth);
        const computedScale = 0.7 + (depth * 0.35);
        
        initialQuotes.push({
          id: Math.random().toString(),
          text: quote.text,
          x: pos.x,
          y: pos.y,
          rotation: 0, // Perfectly straight
          scale: computedScale, // Unified scaling based on 3D depth
          depth: depth,
          fadeState: 'in',
          createdAt: Date.now() + i * 1500 // staggered birth times
        });
      }
      return initialQuotes;
    });

    // Routine quote checker: every 3 seconds, if there are less than 5 quotes visible, spawn a new one!
    const spawnTimer = setInterval(() => {
      // Prioritize active zoom, or being deep in the rhombus transition (sz > 1600)
      if (isZoomingRef.current || reachedZoomEndRef.current || scrollZRef.current > 1600) return;

      setActiveQuotes((prev) => {
        if (prev.length >= 5) return prev;

        const nextQuote = getNextQuote(prev);
        if (!nextQuote) return prev;

        // Find the least occupied Z-depth to distribute quotes beautifully across different planes
        const depthOptions = [0.4, 0.8, 1.2, 1.6];
        const occupancy: Record<number, number> = { 0.4: 0, 0.8: 0, 1.2: 0, 1.6: 0 };
        prev.forEach((q) => {
          if (q.depth in occupancy) {
            occupancy[q.depth]++;
          }
        });

        const sortedDepths = [...depthOptions].sort((a, b) => occupancy[a] - occupancy[b]);
        const chosenDepth = sortedDepths[0];

        const pos = generateCleanPlacement(prev, chosenDepth);
        const computedScale = 0.7 + (chosenDepth * 0.35);

        const newInstance: FloatingQuoteInstance = {
          id: Math.random().toString(),
          text: nextQuote.text,
          x: pos.x,
          y: pos.y,
          rotation: 0, // Perfectly straight
          scale: computedScale, // Unified scaling based on 3D depth
          depth: chosenDepth,
          fadeState: 'in',
          createdAt: Date.now()
        };

        return [...prev, newInstance];
      });
    }, 3200);

    // Lifespan timer: Slowly recycle individual quotes after 14 seconds of display
    const recycleTimer = setInterval(() => {
      // Prioritize active zoom, or being deep in the rhombus transition (sz > 1600)
      if (isZoomingRef.current || reachedZoomEndRef.current || scrollZRef.current > 1600) return;

      const now = Date.now();
      let finishedThisBatch = 0;
      
      setActiveQuotes((prev) => {
        const next = prev.map(q => {
          // If quote has lived past 14 seconds, set its fadeState to out
          if (now - q.createdAt > 14000 && q.fadeState === 'in') {
            finishedThisBatch++;
            return { ...q, fadeState: 'out' };
          }
          return q;
        });

        if (finishedThisBatch > 0) {
          setFinishedQuotesCount(c => c + finishedThisBatch);
        }
        return next;
      });

      // Clear out quotes that have finished fading out (lived past 15.5 seconds)
      setTimeout(() => {
        setActiveQuotes((prev) => prev.filter(q => {
          const isExpired = now - q.createdAt > 15500 && q.fadeState === 'out';
          return !isExpired;
        }));
      }, 1500);

    }, 2000);

    return () => {
      clearInterval(spawnTimer);
      clearInterval(recycleTimer);
    };
  }, [phase]);

  // Ambient sound mute controller
  const handleMuteToggle = (e: MouseEvent) => {
    e.stopPropagation(); // don't trigger chime click
    const muted = audio.toggleMute();
    setIsMuted(muted);
    
    const notice = muted ? "Ambient melody muted" : "Ambient melody playing";
    setMuteNotice(notice);
    setTimeout(() => {
      setMuteNotice(null);
    }, 3000);
  };

  return (
    <div
      id="app-container"
      ref={appContainerRef}
      className="fixed inset-0 w-full h-full overflow-hidden text-[#1C1917] select-none font-sans bg-[#FAF9F5]"
      style={{
        cursor: 'none'
      }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleScreenClick}
    >
      {/* 1. Animated Film Grain with Mouse Clearing Spotlight */}
      <canvas
        id="grain-canvas"
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[60]"
      />

      {/* 2. Interactive Click Ripples */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            initial={{ 
              x: ripple.x, 
              y: ripple.y, 
              scale: 0, 
              opacity: 0.9
            }}
            animate={{ 
              scale: [0, 1.3, 1.8], 
              opacity: [0.9, 0.3, 0],
              borderWidth: ["3.5px", "1.5px", "0px"]
            }}
            transition={{ 
              duration: 1.5, 
              ease: "easeOut" 
            }}
            className="absolute rounded-full border transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              borderColor: ripple.color,
              boxShadow: `0 0 25px ${ripple.color}`,
              width: `${ripple.maxRadius}px`,
              height: `${ripple.maxRadius}px`,
            }}
          />
        ))}
      </div>

      {/* Warm parchment paper ambient radial glow */}
      <div
        ref={glowOverlayRef}
        className="absolute inset-0 pointer-events-none z-0 bg-radial-gradient from-transparent via-[#F7F5EC]/40 to-[#ECE9DB]/60"
      />

      {/* 3. Top Right: Minimalistic branding & music controllers */}
      <div 
        id="page-header"
        className="absolute top-8 right-8 z-30 flex flex-col items-end text-right select-none pointer-events-auto"
      >
        <button
          id="header-brand-btn"
          onClick={handleMuteToggle}
          className="group flex items-center gap-2.5 px-3.5 py-1.5 rounded-full hover:bg-stone-200/50 active:bg-stone-300/40 transition-all duration-300 outline-none border border-transparent hover:border-stone-300/30"
          title="Toggle ambient music"
        >
          {phase === 'alley' && (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[9px] text-neutral-400 font-mono tracking-wider">
              {isMuted ? "PLAY MUSIC" : "MUTE MUSIC"}
            </span>
          )}
          <span className="text-xs font-light tracking-[0.25em] opacity-65 font-sans uppercase group-hover:opacity-100 transition-opacity">
            Ashwin's Alley
          </span>
          {phase === 'alley' && (
            <div className="opacity-50 group-hover:opacity-100 transition-opacity ml-0.5">
              {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} className="animate-pulse" />}
            </div>
          )}
        </button>

        {/* Transient audio feedback notice */}
        <AnimatePresence>
          {muteNotice && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 0.6, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[9px] text-stone-400 font-mono mt-1 mr-4 tracking-wide pointer-events-none"
            >
              {muteNotice}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Intro: Loading Logo + About Lines */}
      {phase === 'loading' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#FAF9F5] px-6 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <span className="text-[100px] md:text-[140px] font-extralight text-stone-800 leading-none mb-6 select-none">
              愛
            </span>
            <div className="relative h-[2px] bg-stone-200 rounded-full overflow-hidden" style={{ width: '160px' }}>
              <div
                className="absolute left-0 top-0 h-full bg-stone-600 rounded-full transition-all duration-100 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* 5. Spatial Zoom Viewport (About Lines + Scattered Quotes) */}
      {(phase === 'about' || phase === 'alley') && (
        <div id="experience-viewport" className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}>
          
          {phase === 'about' && (
            <div
              ref={scrollInstructionRef}
              className="absolute left-1/2 top-1/2 text-center pointer-events-none z-10"
              style={{ transform: 'translate(-50%, -50%)', opacity: 1 }}
            >
              <p className="text-lg md:text-xl font-light text-stone-400 tracking-[0.2em] uppercase">
                Scroll UP to explore
              </p>
            </div>
          )}

          {phase === 'about' && aboutLinesRef.current.map((line) => (
            <div
              key={line.id}
              className="about-line absolute left-1/2 top-1/2 select-none pointer-events-none text-center max-w-lg"
              data-idx={line.idx}
              style={{
                transform: `translate(-50%, -50%) perspective(1000px) translate3d(0px, 0px, ${line.zOffset}px) scale(1)`,
                opacity: 0,
              }}
            >
              <p className="text-sm md:text-base font-light text-stone-600 tracking-wide leading-relaxed">
                {line.text}
              </p>
            </div>
          ))}
          {phase === 'alley' && (
            <AnimatePresence mode="popLayout">
              {activeQuotes.map((quote) => (
                <motion.div
                  key={quote.id}
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: isZooming ? 0.95 : (quote.fadeState === 'in' ? 0.95 : 0)
                  }}
                  exit={{ 
                    opacity: 0
                  }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className="absolute"
                  style={{
                    left: `${quote.x}vw`,
                    top: `${quote.y}vh`,
                    zIndex: quote.depth > 1.0 ? 25 : 5,
                  }}
                >
                  {/* 3D spatial zoom + parallax inner layout targeted dynamically via RAF */}
                  <div
                    className="parallax-quote select-none pointer-events-none text-left max-w-[210px] md:max-w-[290px]"
                    data-depth={quote.depth}
                    data-scale={quote.scale}
                    style={{
                      transform: `perspective(1000px) translate3d(0px, 0px, ${(quote.depth - 1.6) * 400}px) scale(${quote.scale})`,
                      opacity: 0.95
                    }}
                  >
                    <p className="text-sm md:text-base font-light leading-relaxed text-[#1C1917] tracking-wide select-none drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]">
                      “{quote.text}”
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* 5b. Ashwin's Alley Click-to-Enter Prompt */}
      <AnimatePresence>
        {aboutComplete && phase === 'about' && (
          <motion.div
            key="ashwins-alley-prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto"
          >
            <button
              onClick={() => {
                targetScrollZRef.current = 0;
                scrollZRef.current = 0;
                setPhase('alley');
                phaseRef.current = 'alley';
                setAboutComplete(false);
                setTimeout(() => audio.playWindchimeClick(0.35, 0.45), 100);
                setTimeout(() => audio.playWindchimeClick(0.65, 0.50), 350);
              }}
              className="group flex flex-col items-center gap-3 px-8 py-4"
            >
              <span className="text-2xl md:text-3xl font-extralight tracking-[0.15em] text-stone-800 group-hover:text-stone-600 transition-colors duration-500">
                Ashwin's Alley
              </span>
              <span className="text-[9px] font-mono tracking-widest text-stone-400 opacity-60 group-hover:opacity-0 transition-opacity duration-500">
                Click to enter
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Rhombus Space Sanctuary Reveal driven by Spatial Zoom */}
      {phase === 'alley' && (
        <div
          ref={rhombusContainerRef}
          className="absolute inset-0 m-auto z-20 pointer-events-none flex flex-col items-center justify-center w-[360px] h-[360px]"
          style={{ transform: 'scale(0)', opacity: 0 }}
        >
          {/* SVG for the double borders drawn from 4 corners */}
          <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 400 400">
            {/* Filled background of the rhombus gateway (Aligned with inner border vertices) */}
            <polygon id="rhombus-fill" points="200,25 375,200 200,375 25,200" fill="none" stroke="none" />

            {/* Outer Corner Paths */}
            {/* Top Corner */}
            <path className="rhombus-border-path" d="M 200 10 L 105 105" stroke="#FAF9F5" strokeWidth="1.5" fill="none" />
            <path className="rhombus-border-path" d="M 200 10 L 295 105" stroke="#FAF9F5" strokeWidth="1.5" fill="none" />
            {/* Right Corner */}
            <path className="rhombus-border-path" d="M 390 200 L 295 105" stroke="#FAF9F5" strokeWidth="1.5" fill="none" />
            <path className="rhombus-border-path" d="M 390 200 L 295 295" stroke="#FAF9F5" strokeWidth="1.5" fill="none" />
            {/* Bottom Corner */}
            <path className="rhombus-border-path" d="M 200 390 L 295 295" stroke="#FAF9F5" strokeWidth="1.5" fill="none" />
            <path className="rhombus-border-path" d="M 200 390 L 105 295" stroke="#FAF9F5" strokeWidth="1.5" fill="none" />
            {/* Left Corner */}
            <path className="rhombus-border-path" d="M 10 200 L 105 295" stroke="#FAF9F5" strokeWidth="1.5" fill="none" />
            <path className="rhombus-border-path" d="M 10 200 L 105 105" stroke="#FAF9F5" strokeWidth="1.5" fill="none" />

            {/* Inner Corner Paths (Double Border) */}
            {/* Top Corner */}
            <path className="rhombus-border-path opacity-80" d="M 200 25 L 112 112" stroke="#FAF9F5" strokeWidth="1" strokeDasharray="3,3" fill="none" />
            <path className="rhombus-border-path opacity-80" d="M 200 25 L 288 112" stroke="#FAF9F5" strokeWidth="1" strokeDasharray="3,3" fill="none" />
            {/* Right Corner */}
            <path className="rhombus-border-path opacity-80" d="M 375 200 L 288 112" stroke="#FAF9F5" strokeWidth="1" strokeDasharray="3,3" fill="none" />
            <path className="rhombus-border-path opacity-80" d="M 375 200 L 288 288" stroke="#FAF9F5" strokeWidth="1" strokeDasharray="3,3" fill="none" />
            {/* Bottom Corner */}
            <path className="rhombus-border-path opacity-80" d="M 200 375 L 288 288" stroke="#FAF9F5" strokeWidth="1" strokeDasharray="3,3" fill="none" />
            <path className="rhombus-border-path opacity-80" d="M 200 375 L 112 288" stroke="#FAF9F5" strokeWidth="1" strokeDasharray="3,3" fill="none" />
            {/* Left Corner */}
            <path className="rhombus-border-path opacity-80" d="M 25 200 L 112 288" stroke="#FAF9F5" strokeWidth="1" strokeDasharray="3,3" fill="none" />
            <path className="rhombus-border-path opacity-80" d="M 25 200 L 112 112" stroke="#FAF9F5" strokeWidth="1" strokeDasharray="3,3" fill="none" />
          </svg>

          {/* Inner Text or Core element with absolute centering to prevent layout-flow and scaling sway artifacts */}
          <div className="absolute inset-0 select-none pointer-events-none">
            {/* "Silence of Empty Space" Text */}
            <div
              ref={textRef}
              className="absolute top-1/2 left-1/2 text-center font-sans tracking-[0.3em] text-xs uppercase leading-relaxed font-light text-[#FAF9F5] whitespace-nowrap"
              style={{ opacity: 0, transform: 'translate(-50%, -50%) scale(1)' }}
            >
              Silence of<br />Empty Space
            </div>

            {/* Emitting Dot (Zen core) */}
            <div
              ref={emittingDotRef}
              className="absolute top-1/2 left-1/2 flex items-center justify-center w-24 h-24 pointer-events-none"
              style={{ opacity: 0, transform: 'translate(-50%, -50%) scale(1)' }}
            >
              {/* Multiple expanding halo waves for a highly polished, nostalgic look */}
              <div className="w-12 h-12 rounded-full border border-[#FAF9F5]/25 animate-ping absolute" />
              <div className="w-20 h-20 rounded-full border border-[#FAF9F5]/10 animate-pulse absolute" style={{ animationDuration: '3s' }} />
              <div className="w-3.5 h-3.5 rounded-full bg-[#FAF9F5] shadow-[0_0_15px_rgba(250,249,245,0.85)]" />
            </div>
          </div>
        </div>
      )}

      {/* Instruction Cue helper */}
      {(phase === 'about' || phase === 'alley') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-[9px] font-mono tracking-widest uppercase select-none text-center"
        >
          <span className="cue-highlight">Scroll Up/Down to explore • Click to ring chimes</span>
        </motion.div>
      )}

      {/* 7b. Memory content overlay (dwell or click a leaf header) */}
      {activeContent && (
        <div
          id="memory-content-overlay"
          className="absolute inset-0 z-30 flex items-center justify-center px-8 md:px-16 pointer-events-none select-none"
          style={{ opacity: 0 }}
        >
          <div className="w-full max-w-2xl text-center">
            {activeContentTag && (
              <div className="text-[9px] font-mono tracking-[0.4em] uppercase text-[#FAF9F5]/40 mb-7">
                {activeContentTag}
              </div>
            )}
            <h2 className="text-2xl md:text-3xl font-extralight tracking-wide text-[#FAF9F5] mb-9 leading-snug">
              {activeContent.title}
            </h2>
            <div className="flex flex-col gap-3">
              {activeContent.lines.map((line, i) => (
                <p key={i} className="text-sm md:text-[15px] font-light text-[#FAF9F5]/75 leading-relaxed text-center">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quote submission */}
      <AboutPopup />
      <QuoteSubmit />
    </div>
  );
}
