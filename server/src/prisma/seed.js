const prisma = require('../lib/prisma');

const demoUsers = [
  {
    email: 'maria@demo.arete',
    name: 'Maria Chen',
    role: 'DEMO',
    passwordHash: 'DEMO_ACCOUNT_NO_LOGIN',
    sportProfile: {
      primarySport: 'running',
      secondarySports: ['hiking', 'yoga'],
      experience: 'intermediate',
      location: { city: 'Portland, OR', lat: 45.5152, lon: -122.6784 },
    },
  },
  {
    email: 'james@demo.arete',
    name: 'James Hartley',
    role: 'DEMO',
    passwordHash: 'DEMO_ACCOUNT_NO_LOGIN',
    sportProfile: {
      primarySport: 'climbing',
      secondarySports: ['trail_running', 'hiking', 'skiing'],
      experience: 'advanced',
      location: { city: 'Boulder, CO', lat: 40.015, lon: -105.2705 },
    },
  },
  {
    email: 'sofia@demo.arete',
    name: 'Sofia Reyes',
    role: 'DEMO',
    passwordHash: 'DEMO_ACCOUNT_NO_LOGIN',
    sportProfile: {
      primarySport: 'triathlon',
      secondarySports: ['running', 'cycling', 'swimming'],
      experience: 'intermediate',
      location: { city: 'Austin, TX', lat: 30.2672, lon: -97.7431 },
    },
  },
  {
    email: 'marcus@demo.arete',
    name: 'Marcus Webb',
    role: 'DEMO',
    passwordHash: 'DEMO_ACCOUNT_NO_LOGIN',
    sportProfile: {
      primarySport: 'running',
      secondarySports: ['strength', 'cycling'],
      experience: 'advanced',
      location: { city: 'Nashville, TN', lat: 36.1627, lon: -86.7816 },
    },
  },
];

// Context files keyed by user email, then by FileType. Written to read like several
// weeks of accumulated coaching notes rather than templated filler.
const contextFiles = {
  'maria@demo.arete': {
    COACH_MEMORY: `# Coach Memory — Maria Chen

## Preferences
- Prefers morning runs before night shifts (usually 6-7am)
- Doesn't like track workouts, prefers trail or road
- Responds well to encouragement, gets anxious before long runs
- Likes detailed pace breakdowns after workouts
- Vegetarian, sometimes low on iron

## Key Context
- Works 3x12hr night shifts per week (Sun/Mon/Tue typically)
- Sleep is inconsistent due to shift rotation
- Has a golden retriever (Scout) she sometimes runs with on easy days
- Running partner for long runs: coworker Danielle
- Signed up for Portland Marathon (Oct 4, 2026) in January

## Coaching Style Notes
- Keep long run pacing conservative, she tends to go out too fast
- Always check sleep data before prescribing intensity
- On post-shift days, cap effort at easy/recovery only
- She logs injuries honestly but downplays fatigue
`,
    GOALS: `# Goals — Maria Chen

## Primary Objective
**Portland Marathon — October 4, 2026**
- Goal time: Sub-4:30 (stretch: sub-4:15)
- This is her first marathon
- Registered January 2026, training started March 2026

## Milestones
- [x] Base building phase (March-May): 25-30 mpw consistent
- [x] Complete a 15-mile long run (achieved June 22)
- [ ] Complete a 20-mile long run (scheduled Sept 6)
- [ ] Race a half marathon as a tune-up (Portland Half, Sept 14)
- [ ] Peak week: 42 miles (week of Sept 15)
- [ ] Taper begins Sept 22

## Secondary Goals
- Maintain yoga 2x/week for injury prevention
- Improve fueling strategy for runs over 90 minutes
- Build confidence running alone on long runs (currently needs a partner for 15+)
`,
    TRAINING_PLAN: `# Training Plan — Maria Chen

## Current Phase: Build 2 (Aug 18 - Sept 7)
Focus: Extend long run to 20 miles, maintain mid-week quality

### Weekly Structure
- **Monday:** OFF (post-shift recovery)
- **Tuesday:** OFF or 30min easy if slept well
- **Wednesday:** Mid-week medium long (8-10 mi, easy pace)
- **Thursday:** Tempo/quality session (6-8 mi with 3-4 mi at marathon pace)
- **Friday:** Easy run (4-5 mi) + strides
- **Saturday:** Easy run (5-6 mi) or cross-train (yoga)
- **Sunday:** Long run (progressive build: 16 > 17 > 18 > 20)

### Target Paces
- Easy: 10:30-11:00/mi
- Marathon pace: 9:45-10:15/mi
- Tempo: 9:15-9:30/mi
- Long run: Start at 11:00, negative split to 10:15 by final miles

### Weekly Mileage Targets
- Week of Aug 18: 34 mi
- Week of Aug 25: 36 mi
- Week of Sept 1: 38 mi (peak week prep)

### Red Flags
- If HRV drops below 30 for 2+ consecutive days, swap quality for easy
- Any knee pain: stop and report immediately (had mild ITBS in May)
- Post-night-shift days are NEVER quality days regardless of how she feels
`,
    TRAINING_HISTORY: `# Training History — Maria Chen

## Recent Log (Last 4 Weeks)

### Week of Aug 18 (Current)
- Mon: OFF
- Tue: 3.1 mi easy, 10:48/mi avg, HR 138. Post-shift, kept it short.
- Wed: 9.2 mi medium long, 10:32/mi, HR 148. Felt strong.
- Thu: (upcoming)

### Week of Aug 11
- Mon: OFF
- Tue: OFF (extra shift coverage)
- Wed: 8.0 mi easy, 10:55/mi, HR 142
- Thu: 7.1 mi with 3 mi @ marathon pace (10:05/mi). Nailed pacing.
- Fri: 4.2 mi easy + 6 strides, HR 132
- Sat: Yoga (60 min power flow)
- Sun: 17.1 mi long run, 10:42/mi avg, HR 152. Negative split last 5 miles. Fueled with 2 gels. Felt great through 14, heavy legs 15-16, rallied at end.
- **Weekly total: 36.4 mi** ✓

### Week of Aug 4
- Mon: OFF
- Wed: 8.5 mi, 10:40/mi
- Thu: 6.8 mi tempo, 3.5 mi @ 9:22/mi (faster than target — reminded to hold back)
- Fri: 4.0 mi recovery
- Sat: 5.2 mi easy with Scout
- Sun: 16.0 mi long run, 10:51/mi. Struggled at mile 13, GI issues. Need to test fuel earlier.
- **Weekly total: 40.5 mi** (over target, pulled back next week)

### Week of July 28
- Mon: OFF
- Wed: 7.5 mi easy
- Thu: 7.0 mi, 4x800m intervals @ 8:45/mi. First speed work. HR spiked to 178.
- Fri: OFF (tired)
- Sat: 4.5 mi recovery + yoga
- Sun: 15.2 mi long run, 11:02/mi. Deliberately conservative after high-mileage week.
- **Weekly total: 34.2 mi**

## Patterns
- Consistently hits long run targets
- Tempo pacing tends to drift faster than prescribed
- Post-shift runs are always cut short or skipped (appropriate)
- HRV rebounds well after rest days
- GI issues on long runs need attention (fuel timing/type)
`,
    HEALTH_PROFILE: `# Health Profile — Maria Chen

## Baseline Metrics
- Age: 32
- Height: 165 cm
- Weight: 61 kg (fluctuates 60-62)
- RHR: 56-60 bpm (trends lower during taper)
- HRV baseline: 42 ms (range 34-55)
- VO2max (COROS): 42

## Sleep
- Highly variable due to night shifts
- Non-shift nights: 7-8 hrs, sleep score 75-85
- Post-shift days: 5-6 hrs fragmented, sleep score 50-65
- Consistently low deep sleep percentage (15-18%)

## Health Notes
- Mild ITBS flare-up May 2026, resolved with foam rolling + hip strengthening
- Vegetarian — iron levels were low in March bloodwork, now supplementing
- No current injuries
- Takes: daily multivitamin, iron supplement, vitamin D
- Occasional acid reflux on long runs (testing fuel options)

## Limitations
- Cannot do high-intensity work on post-shift days (sleep debt)
- Heat sensitive — Portland summers are manageable but needs hydration plan
- Prone to anxiety before milestone runs (affects sleep the night before)
`,
  },

  'james@demo.arete': {
    COACH_MEMORY: `# Coach Memory — James Hartley

## Preferences
- Data-driven, wants to see numbers and trends
- Climbs 4-5 days/week, views running as cross-training
- Doesn't like rest days but respects them when shown the recovery data
- Prefers early morning training (5:30am gym sessions before work)
- Competitive with himself, tracks everything

## Key Context
- Software engineer at a Boulder startup, flexible schedule
- Climbing partner: Kyle (similar level, also projecting the Diamond)
- Has been climbing 6 years, trad leading 2 years
- Hangboard setup at home
- Previous alpine objectives: Flatirons linkup, Petit Grepon

## Coaching Style Notes
- Show him the training load ratios — he responds to data
- His finger tendons need monitoring, he overtrains grip
- Running fitness is a tool for approach fitness, not a goal itself
- Remind him that rest IS training when load ratio exceeds 1.2
`,
    GOALS: `# Goals — James Hartley

## Primary Objective
**The Diamond (Longs Peak, RMNP) — D7 Route, September 2026**
- Style: Single-day push, car-to-car
- Target: 14-16 hour round trip
- Grade: 5.10 trad, ~1,000ft of technical climbing + 5,000ft approach
- Window: Sept 13-20 (weather dependent)

## Preparation Milestones
- [x] Lead 5.10 trad consistently at Eldorado Canyon (May-June)
- [x] Complete Petit Grepon car-to-car as a rehearsal (July 19 — 11 hrs)
- [x] Run Longs Peak approach trail (Loft Route) for recon (Aug 2)
- [ ] Complete a 5,000ft+ gain trail run under 3 hours
- [ ] Simulated big day: 14+ hours of sustained effort
- [ ] Final gear check and rack rehearsal

## Secondary Goals
- Maintain 5.11a redpoint fitness indoors through training
- Trail running: comfortable at 9,000-14,000ft elevation
- Improve efficiency on low-5th-class scrambling (speed, not difficulty)
`,
    TRAINING_PLAN: `# Training Plan — James Hartley

## Current Phase: Peak / Specificity (Aug 18 - Sept 7)
Focus: Simulate big-day demands, maintain climbing sharpness, approach fitness

### Weekly Structure
- **Monday:** AM hangboard (repeaters protocol) + 45min trail run
- **Tuesday:** Climb outdoors — trad multi-pitch at Eldorado or Flatirons
- **Wednesday:** Trail run (long, with vertical gain focus: 2,500-4,000ft)
- **Thursday:** Indoor climb (volume, 5.9-5.10 range, endurance sets)
- **Friday:** REST
- **Saturday:** Big day simulation (climb + approach OR long alpine trail)
- **Sunday:** Active recovery (easy hike or yoga, 60min max)

### Running Targets
- Weekly vertical gain: 5,000-8,000ft
- Long trail run: 8-12 mi with 3,000-4,000ft gain
- Easy runs: conversational pace, HR under 145
- No road running. All trails.

### Climbing Targets
- 2 outdoor trad days/week minimum
- Indoor: 1 endurance session (4x4s or circuits)
- Hangboard: 2x/week, max hangs Mon, repeaters Thu

### Red Flags
- Any finger pulley pain: stop climbing immediately, report
- If resting HR rises 5+ bpm above baseline for 2+ days, take an extra rest day
- Training load ratio above 1.3: mandatory rest before Saturday big day
`,
    TRAINING_HISTORY: `# Training History — James Hartley

## Recent Log (Last 4 Weeks)

### Week of Aug 18 (Current)
- Mon: Hangboard (max hangs, 3-finger drag: +45lb x 10s x 5 sets, half-crimp: +35lb). Trail run 5.2 mi, 1,800ft gain, HR avg 142.
- Tue: Eldorado — Bastille Crack (5.7) + Yellow Spur (5.9+), 4 pitches total. Clean leads, felt efficient.
- Wed: (upcoming)

### Week of Aug 11
- Mon: Hangboard + 4.8 mi trail run, 1,600ft gain
- Tue: Flatirons — First + Third linkup, 5 hrs moving time. Scrambling felt fast.
- Wed: 10.1 mi trail run, Bear Peak loop, 3,400ft gain, 2:15 moving time. HR avg 148. Legs heavy from Tuesday.
- Thu: Indoor climbing, 4x4 endurance circuit (V3-V4 range). 45 min session.
- Fri: REST
- Sat: Simulated big day — Longs Peak Keyhole Route, 14.5 mi, 5,100ft gain, 9:20 total time. Not technical but tested pacing, fueling, altitude. Felt strong to 13,500ft, slight headache on summit.
- Sun: Easy 3 mi hike, Green Mountain
- **Vertical gain: 10,100ft** ✓

### Week of Aug 4
- Mon: Hangboard + 5.0 mi trail, 1,900ft
- Tue: Eldorado — Rotwand (5.9), Wind Ridge (5.10a). Clean on Rotwand, took on Wind Ridge crux.
- Wed: 8.3 mi trail, 2,800ft. South Boulder Peak.
- Thu: Indoor, moderate session, practiced gear placements on lead wall
- Fri: REST
- Sat: Kyle day — Petit Grepon, car-to-car 11 hrs. All pitches clean. Descent was slow (scree).
- Sun: OFF (wrecked)
- **Vertical gain: ~9,800ft**

## Patterns
- Vertical gain targets consistently met
- Altitude tolerance improving (no headaches below 13,500ft now)
- Hangboard strength progressing steadily
- Needs to watch recovery after back-to-back big days
- Kyle partnership is solid for the Diamond push
`,
    HEALTH_PROFILE: `# Health Profile — James Hartley

## Baseline Metrics
- Age: 28
- Height: 178 cm
- Weight: 72 kg
- RHR: 50-54 bpm
- HRV baseline: 58 ms (range 45-72)
- VO2max (COROS): 52

## Sleep
- Consistent schedule (10:30pm - 6:00am)
- Sleep score typically 78-88
- Deep sleep: 20-24% (good)
- Sleep disrupted before big climbing days (anticipation)

## Health Notes
- Left ring finger A2 pulley strain, March 2026 — fully healed, monitoring
- Callus management on hands (tape protocol for long trad days)
- Takes: creatine, protein powder, magnesium before bed
- Mild altitude sensitivity above 13,500ft (headaches, resolved by acclimatization)

## Limitations
- Finger tendon recovery needs 48hrs between max loading
- Cannot do consecutive big alpine days without a full rest day between
- Skin integrity on hands limits consecutive outdoor trad days in summer
`,
  },

  'sofia@demo.arete': {
    COACH_MEMORY: `# Coach Memory — Sofia Reyes

## Preferences
- Structured and organized, likes seeing the full week plan on Monday
- Former college swimmer (D3), swim is her strongest discipline
- New to cycling, nervous in group rides and clipless pedals
- Prefers specificity — "just tell me what to do and I'll do it"
- Morning person, trains 5:30-7am before work

## Key Context
- Project manager at a tech company, high-stress job
- Recently divorced (Jan 2026), triathlon training is her reset
- Lives alone, no kids, flexible schedule outside work
- Bought a road bike in March (Canyon Endurace, first real road bike)
- Swim access: UT outdoor pool (50m) 3x/week, masters group Sat AM

## Coaching Style Notes
- Swim workouts can be aggressive — she has the base
- Bike needs to be 80% confidence building, 20% fitness
- Run is middle ground — decent 5K base (26:00) but no endurance
- She thrives on checklists and completion metrics
- Stress from work shows up as elevated RHR — check before intensity days
`,
    GOALS: `# Goals — Sofia Reyes

## Primary Objective
**Austin Triathlon (Olympic Distance) — November 8, 2026**
- Swim: 1.5K open water
- Bike: 40K
- Run: 10K
- Goal time: Under 3:15 (stretch: sub-3:00)
- First triathlon ever

## Milestones
- [x] Complete a sprint triathlon (CapTex Tri, June 1 — finished 1:28:12)
- [x] Open water swim confidence (Lake Travis practice, July)
- [x] Ride 40K continuously without stopping (achieved Aug 3)
- [ ] Brick workout: 40K bike + 5K run back-to-back
- [ ] Open water swim in race wetsuit (Sept)
- [ ] Race rehearsal: full Olympic distance solo (Oct)
- [ ] T1 and T2 practice (transitions under 2 min each)

## Secondary Goals
- Get comfortable with clipless pedals (no more unclipping at every stop)
- Build run endurance to handle 10K off the bike
- Join a group ride without panic
`,
    TRAINING_PLAN: `# Training Plan — Sofia Reyes

## Current Phase: Build 1 (Aug 11 - Sept 14)
Focus: Increase bike and run volume, maintain swim speed, introduce bricks

### Weekly Structure
- **Monday:** Swim (masters-style intervals, 2,500-3,000m)
- **Tuesday:** Bike (60-75 min, mix of steady + tempo intervals)
- **Wednesday:** Run (45-55 min, easy with strides)
- **Thursday:** Swim (endurance focus, 2,000-2,500m) + short brick run (15 min)
- **Friday:** REST or easy yoga
- **Saturday:** Long bike (90-120 min, route with some climbing) OR brick (bike + run)
- **Sunday:** Long run (50-70 min, easy pace)

### Target Paces/Intensities
- Swim: Easy 1:50/100m, Intervals 1:35-1:40/100m, Race pace 1:42/100m
- Bike: Easy 16-17 mph, Tempo 18-19 mph, Target race avg 17.5 mph
- Run: Easy 10:00-10:30/mi, Race pace 9:00-9:15/mi
- Brick run: Accept 30-60s slower than normal for first mile, settle in

### Weekly Volume Targets
- Swim: 6,000-7,000m
- Bike: 60-80 mi
- Run: 15-18 mi
- Total training: 8-10 hrs

### Red Flags
- Work stress spikes (visible in RHR/HRV) — drop intensity, keep volume
- Any knee pain on the bike — check fit, saddle height was adjusted in July
- Open water anxiety — if lake sessions cause stress, pool substitution is fine
`,
    TRAINING_HISTORY: `# Training History — Sofia Reyes

## Recent Log (Last 4 Weeks)

### Week of Aug 18 (Current)
- Mon: Swim 2,800m. Main set: 10x100m @ 1:38, 15s rest. Felt smooth.
- Tue: Bike 65 min, 18.2 mi. Tempo block 20 min @ 18.5 mph. New PR on Jester King hill.
- Wed: (upcoming)

### Week of Aug 11
- Mon: Swim 2,600m, technique focus (catch drills + pull buoy set)
- Tue: Bike 70 min, 19.5 mi, rolling hills. First ride without unclipping at stops!
- Wed: Run 4.8 mi, 10:12/mi, HR 145. Town Lake trail.
- Thu: Swim 2,200m + 12 min brick run (10:35/mi, legs felt like concrete)
- Fri: REST
- Sat: Long bike 95 min, 26.3 mi. Lime Creek Road. Descents still scary.
- Sun: Run 5.5 mi, 10:22/mi. Humid. Brought extra water.
- **Total: ~8.5 hrs** ✓

### Week of Aug 4
- Mon: Swim 2,500m
- Tue: Bike 60 min, 17.1 mi. Easy spin, focused on cadence (target 85 rpm)
- Wed: Run 4.2 mi easy
- Thu: Swim 2,000m + 15 min brick run
- Fri: REST
- Sat: FIRST 40K RIDE — 25.1 mi, 1:32:xx, avg 16.4 mph. Stopped twice for water. Completed!
- Sun: Run 6.0 mi, 10:08/mi. Legs tired from Saturday.
- **Total: ~8 hrs**

## Patterns
- Swim is strongest discipline, consistently hits interval targets
- Bike confidence improving week over week
- Brick runs always start rough, normalize by mile 2
- Run pace is consistent but needs more volume for 10K off the bike
- Heat and humidity in Austin are a factor — hydration planning critical
`,
    HEALTH_PROFILE: `# Health Profile — Sofia Reyes

## Baseline Metrics
- Age: 35
- Height: 168 cm
- Weight: 64 kg
- RHR: 58-62 bpm
- HRV baseline: 38 ms (range 28-48)
- VO2max (COROS): 39

## Sleep
- Generally good (10:30pm - 5:30am, 7 hrs)
- Sleep score 72-82
- Deep sleep: 18-22%
- Disrupted 1-2 nights/week (work stress, mind racing)

## Health Notes
- No current injuries
- Saddle soreness from longer bike rides (resolved with chamois cream + new saddle)
- Swimmer's shoulder history (college) — no current issues, doing prehab
- Takes: daily multivitamin, fish oil, melatonin occasionally
- Prone to dehydration in Austin heat

## Limitations
- Work stress directly correlates with elevated RHR (+4-6 bpm on bad weeks)
- Open water swimming creates anxiety (manageable, getting better)
- Limited cycling experience means technical descents are a limiter
- HRV baseline is lower than expected for fitness level (likely stress-related)
`,
  },

  'marcus@demo.arete': {
    COACH_MEMORY: `# Coach Memory — Marcus Webb

## Preferences
- Patient and methodical — understands periodization deeply (he's a coach himself)
- Wants to be challenged but respects the recovery timeline
- Communicates in coaching language (RPE, zones, load management)
- Prefers evening training (4:30-6pm after his athletes' sessions)
- Values the mental health benefits of training as much as physical

## Key Context
- High school cross country and track coach in Nashville, 15 years
- Former competitive marathoner (PR 2:58, set at age 34)
- Ruptured left Achilles tendon playing pickup basketball, February 2026
- Surgery February 14, 2026. Full reconstruction.
- Cleared to run (with restrictions) by PT in June 2026
- Has coached dozens of athletes through comebacks — hardest to coach himself

## Coaching Style Notes
- He knows more than most athletes — don't oversimplify
- The challenge is keeping him from progressing too fast
- Every run should have an Achilles load check: pain 0-3 acceptable, 4+ stop
- Eccentric calf exercises are non-negotiable daily
- Frame setbacks as data, not failure — he already knows this but needs reminding
`,
    GOALS: `# Goals — Marcus Webb

## Primary Objective
**Return to running 30+ miles per week pain-free — by January 2027**
- Not a race goal. The goal is sustainable, healthy running.
- Stretch: pace a 5K race at his school's invitational (Nov 15, 2026)

## Milestones
- [x] Walk 30 minutes continuously without pain (April 2026)
- [x] Run/walk intervals: 1 min run / 2 min walk x 10 (June 20)
- [x] Run 15 minutes continuously (July 12)
- [x] Run 3 miles continuously (Aug 8)
- [ ] Run 5 miles continuously, sub-10:00/mi avg
- [ ] Complete a week at 15 mpw with no Achilles flare
- [ ] Run 3 consecutive weeks at 20 mpw
- [ ] First tempo effort (Oct/Nov, TBD based on progress)
- [ ] Pace the 5K invitational (Nov 15, if cleared)

## Secondary Goals
- Maintain upper body and core strength built during non-running months
- Cycling as cross-training to maintain aerobic base without impact
- Help his XC athletes from experience — model the comeback process
`,
    TRAINING_PLAN: `# Training Plan — Marcus Webb

## Current Phase: Return to Run — Progressive Loading (Aug 18 - Sept 28)
Focus: Build to 15 mpw with strict load management, daily Achilles protocol

### Weekly Structure
- **Monday:** Cross-train (stationary bike, 45 min, moderate) + eccentric calf work
- **Tuesday:** Run (easy, time-based: currently 25-30 min)
- **Wednesday:** Strength (full body, emphasis on posterior chain + single-leg work) + eccentric calf work
- **Thursday:** Run (easy, slightly longer: 30-35 min)
- **Friday:** REST or easy walk (30 min)
- **Saturday:** Run (longest run of week: 35-40 min) + eccentric calf work
- **Sunday:** Cross-train (bike or pool running, 30-45 min)

### Run Rules
- ALL runs at easy/conversational pace. No pace targets yet.
- Achilles pain check: rate 0-10 before, during, after. Log it.
  - 0-2: proceed normally
  - 3: finish the run but don't extend
  - 4+: stop, walk home, report
- Weekly mileage increase: max 10% OR 2 miles, whichever is LESS
- No consecutive run days
- No hills deliberately. Flat routes only.
- No speed work until cleared (earliest October)

### Current Mileage Targets
- Week of Aug 18: 11-12 mi (3 runs)
- Week of Aug 25: 12-13 mi
- Week of Sept 1: 13-14 mi
- Week of Sept 8: 10 mi (deload)
- Week of Sept 15: 14-15 mi

### Red Flags
- Achilles pain at 4+ at any point: stop run, reassess next day
- Morning stiffness in Achilles lasting >15 min: reduce next run by 50%
- Any swelling: 48 hrs off running, ice, report
- RHR 5+ above baseline: skip intensity (not applicable yet, but habit-building)
`,
    TRAINING_HISTORY: `# Training History — Marcus Webb

## Recent Log (Last 4 Weeks)

### Week of Aug 18 (Current)
- Mon: Bike 42 min, easy/moderate. Eccentric calf raises 3x15.
- Tue: Run 28 min, 2.9 mi, 9:38/mi. Achilles: 1 before, 1 during, 1 after. Best run yet.
- Wed: (upcoming)

### Week of Aug 11
- Mon: Bike 40 min + eccentrics
- Tue: Run 25 min, 2.6 mi, 9:36/mi. Achilles: 1/1/2. Slight tightness at cooldown, resolved with stretching.
- Wed: Strength session. Single-leg RDLs, calf raises, goblet squats, planks.
- Thu: Run 28 min, 2.8 mi, 10:00/mi. Deliberately slower. Achilles: 0/1/1.
- Fri: Walk 30 min
- Sat: Run 32 min, 3.2 mi, 10:00/mi. Shelby Bottoms Greenway. Achilles: 1/1/1. FIRST 5K+ DISTANCE.
- Sun: Pool running 30 min
- **Weekly total: 8.6 mi (3 runs)** ✓

### Week of Aug 4
- Mon: Bike 38 min + eccentrics
- Tue: Run 22 min, 2.2 mi. Achilles: 1/2/2. Warm day, felt stiff early.
- Wed: Strength
- Thu: Run 25 min, 2.5 mi. Achilles: 1/1/1.
- Fri: REST
- Sat: Run 30 min, 3.0 mi, 10:02/mi. Achilles: 0/1/1.
- Sun: Bike 35 min easy
- **Weekly total: 7.7 mi**

### Week of July 28
- Mon: Bike + eccentrics
- Tue: Run 20 min, 2.0 mi. Achilles: 2/2/2. Warmer than expected.
- Wed: Strength (lighter — deload)
- Thu: Run 22 min, 2.2 mi. Achilles: 1/1/1.
- Fri: REST
- Sat: Run 25 min, 2.5 mi. Achilles: 1/1/1. Felt genuinely good.
- Sun: Pool running 25 min
- **Weekly total: 6.7 mi**

## Patterns
- Achilles pain scores trending down consistently (2s becoming 1s, 1s becoming 0s)
- Morning stiffness resolved within 5 min (down from 10-15 in July)
- Pacing naturally settling around 9:40-10:00 without forcing it
- Calf strength improving (eccentrics progressed from bodyweight to +10lb)
- Mood and energy correlate strongly with running consistency
`,
    HEALTH_PROFILE: `# Health Profile — Marcus Webb

## Baseline Metrics
- Age: 45
- Height: 180 cm
- Weight: 79 kg (up from 75 pre-injury, goal to return to 76-77)
- RHR: 52-56 bpm (was 48-50 pre-injury, trending down)
- HRV baseline: 45 ms (range 35-58, was 55+ pre-injury)
- VO2max (COROS): 44 (was 52 pre-injury, rebuilding)

## Sleep
- Consistent (10pm - 5:45am)
- Sleep score 76-86
- Deep sleep: 19-23%
- Occasionally disrupted by Achilles discomfort (less frequent now)

## Injury History
- **LEFT ACHILLES TENDON RUPTURE — February 8, 2026**
  - Full rupture during basketball
  - Surgical repair February 14, 2026
  - Cast 6 weeks, boot 4 weeks, PT started April
  - Cleared to run June 15, 2026 (with restrictions)
  - Current status: progressive return, pain-free at most loads
- Right knee: mild patellofemoral syndrome (managed, flares with high bike volume)
- Lower back: occasional tightness (addressed with core work)

## Current Protocol
- Eccentric calf raises: 3x15, 2-3x/day, progressing load
- Ankle mobility drills: pre-run routine, 5 min
- Ice after all runs: 15 min
- Compression sleeve during runs
- Monthly PT check-in (next: Sept 5)

## Limitations
- No consecutive running days
- No hills (eccentric load on Achilles too high currently)
- No speed work until October earliest
- Impact activities (basketball, jumping) prohibited until 2027
- Weight needs monitoring — each pound adds ~4x force on Achilles per stride
`,
  },
};

async function seedUser(demoUser) {
  const { email, ...fields } = demoUser;

  const user = await prisma.user.upsert({
    where: { email },
    update: fields,
    create: { email, ...fields },
  });

  console.log(`  user ${email} (${user.id})`);

  const files = contextFiles[email];
  if (!files) {
    throw new Error(`No context files defined for ${email}`);
  }

  for (const [fileType, content] of Object.entries(files)) {
    await prisma.contextFile.upsert({
      where: { userId_fileType: { userId: user.id, fileType } },
      update: { content },
      create: { userId: user.id, fileType, content },
    });
    console.log(`    context file ${fileType} (${content.length} chars)`);
  }
}

async function main() {
  console.log('Seeding demo athletes…');

  for (const demoUser of demoUsers) {
    await seedUser(demoUser);
  }

  const [userCount, fileCount] = await Promise.all([
    prisma.user.count({ where: { role: 'DEMO' } }),
    prisma.contextFile.count({ where: { user: { role: 'DEMO' } } }),
  ]);

  console.log(`Done. ${userCount} demo users, ${fileCount} context files.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
