/**
 * Draft curricula for the two flipped-classroom programs. Flipped classroom:
 * the golfer watches the lesson at home (Tom's real YouTube videos where one
 * exists), does the homework at the range, and takes a short low-stakes quiz —
 * instant feedback, no pass/fail, it exists to surface misunderstanding before
 * it gets grooved into a swing.
 *
 * DRAFT PENDING TOM HARRIS'S REVIEW. The video IDs are his real published
 * lessons; the weekly structure, homework and quiz questions are our proposed
 * curriculum and ship only after he approves or corrects them.
 */

export interface QuizQuestion {
  q: string
  options: string[]
  answer: number // index into options
  explain: string
}

export interface WeekSpec {
  week: number
  title: string
  videoId: string | null
  homework: string
  quiz: QuizQuestion[]
}

export interface ProgramSpec {
  slug: string
  name: string
  description: string
  priceMinor: number
  currency: string
  weeks: WeekSpec[]
}

const q = (qq: string, options: string[], answer: number, explain: string): QuizQuestion => ({
  q: qq, options, answer, explain,
})

/** 8 weeks: fundamentals through full swing. */
export const EIGHT_WEEK: ProgramSpec = {
  slug: 'build-your-swing-8',
  name: 'Build Your Swing — 8 Weeks',
  description:
    'Fundamentals to full swing in eight weeks, flipped-classroom style: watch the lesson at home, do the homework at the range, check yourself with a short quiz. Draft curriculum pending Tom Harris review.',
  priceMinor: 19900,
  currency: 'usd',
  weeks: [
    {
      week: 1,
      title: 'Posture and grip',
      videoId: 'JNYa-7n6KhI',
      homework: 'Ten minutes a day in front of a mirror: take your grip and posture, hold five seconds, step away, repeat. No ball this week.',
      quiz: [
        q('Where should the club sit in your lead hand?', ['In the palm', 'In the fingers', 'Against the thumb only'], 1, 'A finger grip lets the wrists hinge; a palm grip locks them.'),
        q('Good posture starts by bending from the…', ['Knees', 'Waist', 'Hips'], 2, 'Tilt from the hips with a straight back; knees flex slightly after.'),
        q('How often should you practice grip and posture this week?', ['Once, hard', 'Daily, short', 'Only at the range'], 1, 'Short daily reps build the habit faster than one long session.'),
      ],
    },
    {
      week: 2,
      title: 'Backswing sequence',
      videoId: 'sFCHZ4ozj8c',
      homework: 'Slow-motion backswings: ten reps, three times this week, stopping at the top to check the order — club, arms, shoulders, hips.',
      quiz: [
        q('What moves first in the backswing?', ['Hips', 'Club and hands together with the chest', 'Head'], 1, 'The takeaway is one piece; the hips join later.'),
        q('At the top, your back faces…', ['The ball', 'The target', 'The sky'], 1, 'A full shoulder turn puts your back to the target.'),
        q('The purpose of slow-motion reps is…', ['Speed', 'Sequencing', 'Strength'], 1, 'Slow reps let you feel the order; speed comes later.'),
      ],
    },
    {
      week: 3,
      title: 'Pelvis movement',
      videoId: 'A6rHcqT4Uqs',
      homework: 'Hip-turn drills without a club: five minutes daily. Then ten half-swings feeling the pelvis start the downswing.',
      quiz: [
        q('The downswing starts from the…', ['Hands', 'Shoulders', 'Pelvis'], 2, 'Ground up: pelvis leads, torso follows, arms last.'),
        q('Sliding the hips toward the target instead of turning causes…', ['More power', 'Blocked and thin shots', 'A better pivot'], 1, 'A slide stalls rotation; turn, don’t slide.'),
        q('You can practice pelvis movement…', ['Only with a club', 'Anywhere, no club needed', 'Only on grass'], 1, 'It’s a body motion; a mirror is enough.'),
      ],
    },
    {
      week: 4,
      title: 'Strike: low point control',
      videoId: null,
      homework: 'Range session: 30 balls with a towel one grip-length behind the ball. Miss the towel, strike the ball first.',
      quiz: [
        q('A good iron strike hits…', ['Ball then turf', 'Turf then ball', 'Ball only, no turf'], 0, 'Ball first, then the ground just after — that’s compression.'),
        q('Fat shots usually mean the low point is…', ['Too far forward', 'Behind the ball', 'Perfect'], 1, 'Low point behind the ball catches turf first.'),
        q('The towel drill trains…', ['Grip pressure', 'Low point', 'Alignment'], 1, 'It moves your low point to the target side of the ball.'),
      ],
    },
    {
      week: 5,
      title: 'Chipping and pitching',
      videoId: 'lO1TiiPMMx8',
      homework: 'Twenty minutes at the short-game area, twice: land three balls in a row on a towel from 10, then 15, then 20 yards.',
      quiz: [
        q('On a standard chip, most of the ball’s journey should be…', ['In the air', 'Rolling on the green', 'Spinning sideways'], 1, 'Fly it a third, roll it two thirds is a good default.'),
        q('Weight at address for a chip favors the…', ['Back foot', 'Front foot', 'Toes'], 1, 'Front-side weight helps a clean descending strike.'),
        q('The landing-spot drill trains…', ['Distance control', 'Grip', 'Ball position'], 0, 'Pick where it lands; the roll takes care of the rest.'),
      ],
    },
    {
      week: 6,
      title: 'Wedge distances',
      videoId: 'D4ONSmxTVPQ',
      homework: 'Build your clock: hit ten balls each at half, three-quarter and full wedge swings, write down the carry of each.',
      quiz: [
        q('Three wedge swing lengths give you…', ['Three shots', 'Nine-plus distances across your wedges', 'Nothing useful'], 1, 'Lengths times wedges is a matrix of stock yardages.'),
        q('Your “stock” wedge number should be based on…', ['Your best strike ever', 'Your average carry', 'The club’s loft printed number'], 1, 'Plan around what you actually carry, not the hero shot.'),
        q('Why write the numbers down?', ['For social media', 'To choose clubs on the course', 'You shouldn’t'], 1, 'On the course you play to known carries, not guesses.'),
      ],
    },
    {
      week: 7,
      title: 'Putting: speed first',
      videoId: null,
      homework: 'Ladder drill, 15 minutes twice this week: putt to 10, 20, 30 feet, stopping each ball past the last without hitting it.',
      quiz: [
        q('The biggest cause of three-putts for amateurs is…', ['Bad line', 'Bad speed', 'Bad grip'], 1, 'Speed control kills three-putts; line matters less at distance.'),
        q('A good lag leaves you…', ['Anywhere on the green', 'Inside a short, stress-free next putt', 'Past the hole always'], 1, 'Think of a bin-lid circle around the hole.'),
        q('Practicing speed beats practicing 3-footers when you…', ['Never three-putt', 'Often three-putt from long range', 'Only play scrambles'], 1, 'Fix what actually costs you strokes.'),
      ],
    },
    {
      week: 8,
      title: 'Take it to the course',
      videoId: null,
      homework: 'Play nine holes, photograph the scorecard into the app, and mark one hole to review with your pro.',
      quiz: [
        q('The point of week 8 is…', ['A perfect score', 'Transferring range skills to the course', 'Buying new clubs'], 1, 'The course is the exam the range was studying for.'),
        q('When a swing thought fails on the course, you should…', ['Add two more thoughts', 'Go back to one simple feel', 'Quit'], 1, 'One feel per shot; save mechanics for practice.'),
        q('Your scorecard photo feeds…', ['Nothing', 'Your round history and your pro’s prep for next time', 'A leaderboard'], 1, 'Real rounds are the data that makes coaching specific.'),
      ],
    },
  ],
}

/** 6 weeks: scoring-focused short course. */
export const SIX_WEEK: ProgramSpec = {
  slug: 'score-better-6',
  name: 'Score Improvement — 6 Weeks',
  description:
    'Six weeks aimed purely at lower scores: short game, putting, wedges and course strategy. Flipped classroom — lesson at home, homework at the range, low-stakes quiz to check understanding. Draft curriculum pending Tom Harris review.',
  priceMinor: 14900,
  currency: 'usd',
  weeks: [
    {
      week: 1,
      title: 'Where your strokes actually go',
      videoId: null,
      homework: 'Log two rounds in the app (photo the scorecards). Note every penalty and every three-putt.',
      quiz: [
        q('Most amateurs lose the most strokes to…', ['Driver distance', 'Penalties, three-putts and short game', 'Bad luck'], 1, 'The scorecard usually says short game and putting, not the driver.'),
        q('Before fixing your game you should…', ['Guess', 'Measure it', 'Buy a new putter'], 1, 'Two logged rounds tell you what to practice.'),
        q('A penalty stroke costs…', ['Half a shot', 'At least a full shot, often two', 'Nothing if you recover'], 1, 'Stroke plus distance compounds fast.'),
      ],
    },
    {
      week: 2,
      title: 'Chipping basics that hold up',
      videoId: 'lO1TiiPMMx8',
      homework: 'Three short-game sessions: 20 chips each from good lies, aiming to land on a towel.',
      quiz: [
        q('Your default chip should be…', ['The flop', 'The simplest shot that gets rolling early', 'Always a 60-degree'], 1, 'Lowest risk first; save the flop for when you must.'),
        q('Chip with your weight…', ['Back', 'Forward', 'Even'], 1, 'Forward weight, hands ahead, clean strike.'),
        q('Landing spot beats hole-watching because…', ['It’s stylish', 'You control carry; the green controls roll', 'It doesn’t'], 1, 'Pick the landing, let it release.'),
      ],
    },
    {
      week: 3,
      title: 'Kill the three-putt',
      videoId: null,
      homework: 'Ladder drill twice, plus 20 putts from 3 feet daily — make ten in a row before you leave.',
      quiz: [
        q('From 30 feet your goal is…', ['Make it', 'Two putts, stress-free', 'Get it close-ish to the fringe'], 1, 'Lag inside the circle; tap in; move on.'),
        q('Short-putt practice builds…', ['Nothing', 'The confidence that makes lag putting free', 'Wrist action'], 1, 'When 3-footers are automatic, long putts relax.'),
        q('Speed is controlled mainly by…', ['Stroke length', 'Hitting harder with the wrists', 'The putter brand'], 0, 'Longer stroke, same tempo.'),
      ],
    },
    {
      week: 4,
      title: 'One wedge distance you own',
      videoId: 'D4ONSmxTVPQ',
      homework: 'Pick your favorite wedge. 50 balls at your three-quarter swing; write down your carry number.',
      quiz: [
        q('A “go-to” wedge number is useful because…', ['Full swings are easier', 'You can lay up TO it on purpose', 'It impresses people'], 1, 'Strategy means leaving yourself your best shot.'),
        q('Your three-quarter carry should be measured by…', ['Feel', 'Written-down results', 'The shaft label'], 1, 'Numbers beat vibes.'),
        q('Under pressure, a smaller swing is usually…', ['Worse', 'More repeatable', 'Illegal'], 1, 'Less moving parts, more fairways hit with the wedge.'),
      ],
    },
    {
      week: 5,
      title: 'Course strategy: play the percentages',
      videoId: null,
      homework: 'Play nine holes hitting whatever club keeps you in play off every tee — driver only where the app agrees.',
      quiz: [
        q('The smart target on most approach shots is…', ['The pin', 'The fat middle of the green', 'Short-side every time'], 1, 'Middle of the green makes bogey hard and par easy.'),
        q('When water guards one side, aim…', ['At it', 'Away from it and accept a longer putt', 'Doesn’t matter'], 1, 'Take the big number out of play.'),
        q('Driver is the right club when…', ['Always', 'The hole rewards distance more than it punishes the miss', 'Never'], 1, 'It’s a math question, and the app does the math.'),
      ],
    },
    {
      week: 6,
      title: 'Scoring round and review',
      videoId: null,
      homework: 'Play a full round applying weeks 1–5. Photo the card. Compare penalties and putts to week 1.',
      quiz: [
        q('Success this week is measured by…', ['One great shot', 'Fewer penalties and putts than week 1', 'A new handicap overnight'], 1, 'The comparison to your own week-1 baseline is the score.'),
        q('What you practiced most should be…', ['Whatever was fun', 'What week 1 showed was costing you', 'Driver only'], 1, 'Practice where the strokes were leaking.'),
        q('After the program, your round history feeds…', ['Nothing', 'Your pro’s coaching and your next plan', 'Deletion'], 1, 'The data keeps working after the six weeks end.'),
      ],
    },
  ],
}

/**
 * 6 weeks designed for women. Two deliberate design points, both from the
 * product spec: benchmarks and club-choice guidance use women's numbers rather
 * than the industry's men-by-default figures, and the early weeks double as a
 * welcoming on-ramp for players who find courses intimidating to start at.
 */
export const WOMENS_SIX_WEEK: ProgramSpec = {
  slug: 'womens-golf-6',
  name: "Women's Golf — 6 Weeks",
  description:
    "Six weeks built for women, whether you're new to the game or coming back to it: fundamentals, short game, realistic club distances benchmarked to women's data (not men's defaults), and the on-course confidence to book the tee time. Flipped classroom — lesson at home, homework at the range, a short quiz to check understanding. Draft curriculum pending Tom Harris review.",
  priceMinor: 14900,
  currency: 'usd',
  weeks: [
    {
      week: 1,
      title: 'Setup you can trust',
      videoId: 'JNYa-7n6KhI',
      homework: 'Mirror work, ten minutes daily: grip and posture, hold five seconds, reset. Comfort before speed.',
      quiz: [
        q('The club is held mainly in the…', ['Palms', 'Fingers', 'Wrists'], 1, 'Finger grip frees the wrists to hinge naturally.'),
        q('Your practice this week needs…', ['A course', 'A mirror at home', 'A launch monitor'], 1, 'Setup is built at home; no range required.'),
        q('Good posture comes from tilting at the…', ['Knees', 'Hips', 'Neck'], 1, 'Hips tilt, back stays long, knees soften after.'),
      ],
    },
    {
      week: 2,
      title: 'A swing that fits you',
      videoId: 'sFCHZ4ozj8c',
      homework: 'Slow-motion swings, ten reps three times this week. Film one set face-on with the app.',
      quiz: [
        q('Swing speed comes primarily from…', ['Arm strength', 'Sequence and rotation', 'A heavier club'], 1, 'Order of motion beats muscle — good news for everyone.'),
        q('Comparing your distances to men&rsquo;s charts is…', ['Required', 'Misleading — use women&rsquo;s benchmarks', 'Motivating'], 1, 'The right yardstick is data from players like you.'),
        q('Filming your swing helps because…', ['It looks good online', 'Feel and real often differ', 'It doesn&rsquo;t'], 1, 'The camera closes the gap between feel and fact.'),
      ],
    },
    {
      week: 3,
      title: 'Short game, quickly useful',
      videoId: 'lO1TiiPMMx8',
      homework: 'Two 20-minute sessions: land chips on a towel from 10 and 15 yards; finish with ten 3-foot putts in a row.',
      quiz: [
        q('The fastest way to lower scores is usually…', ['300-yard drives', 'Short game and putting', 'New irons'], 1, 'Strokes near the green come back fastest.'),
        q('A chip should spend most of its life…', ['In the air', 'Rolling', 'In a bunker'], 1, 'Land it a third of the way, let it roll.'),
        q('Three-footers are practiced until they are…', ['Occasional', 'Automatic', 'Skipped'], 1, 'Automatic short putts make everything else relaxed.'),
      ],
    },
    {
      week: 4,
      title: 'Know your real distances',
      videoId: null,
      homework: 'Range session with the app: ten balls per club, write down your true average carry for each.',
      quiz: [
        q('Club choice on the course should come from…', ['The number printed on the club', 'Your own measured carries', 'What your partner hits'], 1, 'Your averages are the only chart that matters.'),
        q('If a carry over water needs your best strike ever, you should…', ['Send it', 'Lay up or go around', 'Close your eyes'], 1, 'Plan on your average, not your career best.'),
        q('Distance grows most sustainably from…', ['Swinging harder now', 'Contact quality and sequence', 'Frustration'], 1, 'Center-face contact is free speed.'),
      ],
    },
    {
      week: 5,
      title: 'The course is yours: etiquette & flow',
      videoId: null,
      homework: 'Nine holes at a quiet time (the app suggests one). Goal: pace, positions, and enjoying it — score optional.',
      quiz: [
        q('Ready golf means…', ['Rushing', 'Playing when safe and ready, not strictly by honors', 'Skipping holes'], 1, 'It keeps pace friendly without hurrying anyone.'),
        q('If a group behind is faster, you…', ['Speed up your swing', 'Invite them through at a good moment', 'Ignore them'], 1, 'Waving through is normal and relaxed, not an apology.'),
        q('Your right to be on the course comes from…', ['A low handicap', 'A tee time, same as everyone', 'Years of experience'], 1, 'Every green fee is equal; play your game.'),
      ],
    },
    {
      week: 6,
      title: 'Your first scoring round',
      videoId: null,
      homework: 'Play nine or eighteen, photograph the scorecard into the app, and pick one thing to work on with your pro.',
      quiz: [
        q('This round is measured against…', ['The course record', 'Your own week-1 starting point', 'Your partner'], 1, 'Progress is you versus you.'),
        q('One swing thought on the course beats…', ['Five swing thoughts', 'None ever', 'Music'], 0, 'Keep mechanics at the range; play with one feel.'),
        q('After week 6 your rounds keep feeding…', ['Nothing', 'Your history and your coaching plan', 'A trophy case'], 1, 'The program ends; the improvement loop continues.'),
      ],
    },
  ],
}

/**
 * 6 weeks for juniors and families, built around short courses and
 * pitch-and-putts (off-course golf's fastest on-ramp — think Butler Pitch &
 * Putt, which this app already charts). A parent or guardian enrolls and does
 * the homework WITH the junior; minors ride the existing parental-consent gate.
 */
export const FAMILY_SIX_WEEK: ProgramSpec = {
  slug: 'family-golf-6',
  name: 'Family Golf — 6 Weeks (Juniors & Parents)',
  description:
    'Six weeks for kids and the grown-ups who bring them: games first, short holes early, and a family scramble to finish. Homework happens at putting greens, par-3s and pitch-and-putts — no championship tees required. A parent or guardian enrolls and plays along. Runs equally well as a summer-camp or after-school block, one week per session. Flipped classroom: short lesson at home, playful practice out in the world, a quick quiz kids can ace. Draft curriculum pending Tom Harris review.',
  priceMinor: 12900,
  currency: 'usd',
  weeks: [
    {
      week: 1,
      title: 'Golf is a game: putting games',
      videoId: null,
      homework: 'Twenty minutes at any putting green (or carpet): play "first to five" from 3 feet, then ladder to 10 feet. Let the kid keep score.',
      quiz: [
        q('Golf practice for juniors should feel like…', ['Drills and silence', 'Games with scores', 'Homework'], 1, 'Kids repeat what is fun; games are reps in disguise.'),
        q('The best first club for a junior is…', ['Driver', 'Putter', 'A 2-iron'], 1, 'Putting gives instant success and builds touch first.'),
        q('Who keeps score this week?', ['The parent', 'The junior', 'Nobody'], 1, 'Ownership makes it their game, not yours.'),
      ],
    },
    {
      week: 2,
      title: 'Chip it, land it',
      videoId: 'lO1TiiPMMx8',
      homework: 'Chipping catch: land chips onto a towel from 5, then 10 paces — parent and junior alternate, closest to the towel wins the hole.',
      quiz: [
        q('A chip should mostly…', ['Fly high', 'Roll after a short flight', 'Spin backwards'], 1, 'Land it early, let it roll — easiest shot in golf.'),
        q('When the junior misses badly, the parent should…', ['Fix their swing immediately', 'Say nothing technical and keep the game going', 'End the session'], 1, 'Flow beats correction at this stage; the app and pro handle technique.'),
        q('Winning this week&rsquo;s game means…', ['Perfect technique', 'Landing closest to the towel', 'Longest shot'], 1, 'Target games build skill without a single swing thought.'),
      ],
    },
    {
      week: 3,
      title: 'The half swing',
      videoId: 'sFCHZ4ozj8c',
      homework: 'At the range or a net: 20 half-swings each with a short iron. Game: call your shot — "high or low" — before you hit.',
      quiz: [
        q('Juniors build a full swing from…', ['The top down', 'A half swing that grows', 'Copying tour pros exactly'], 1, 'Small swings that strike the ball grow into big ones.'),
        q('Calling your shot teaches…', ['Showing off', 'Intention — every ball has a job', 'Nothing'], 1, 'A target for every swing, even in practice.'),
        q('If it stops being fun, you should…', ['Push through an hour', 'Play a game or stop for the day', 'Add a lecture'], 1, 'Short and happy beats long and sour, every time.'),
      ],
    },
    {
      week: 4,
      title: 'Pitch-and-putt night',
      videoId: null,
      homework: 'Play 9 holes at a pitch-and-putt or par-3 course as a team scramble: both hit, play the better ball. Photo the scorecard into the app.',
      quiz: [
        q('A scramble means…', ['Everyone plays their own ball', 'Pick the better shot and both play from there', 'Running between shots'], 1, 'Team format: no pressure on any single shot.'),
        q('Short courses are…', ['Practice for real golf', 'Real golf', 'Only for beginners'], 1, 'Off-course and short-course golf count — it is all golf.'),
        q('The scorecard photo does what?', ['Nothing', 'Starts the family&rsquo;s round history in the app', 'Posts to social media'], 1, 'Every round, even nine short holes, feeds the picture.'),
      ],
    },
    {
      week: 5,
      title: 'Etiquette as a superpower',
      videoId: null,
      homework: 'Nine more short-course holes, this time playing your own balls. Junior is in charge of pace, safety and where to stand.',
      quiz: [
        q('Before you swing, you check…', ['Your grip only', 'That nobody is close or ahead', 'The wind'], 1, 'Safety first is rule one, and kids can own it.'),
        q('When another group waits behind you…', ['Hurry your swing', 'Keep pace calmly or wave them through', 'Ignore them'], 1, 'Golf courtesy is confidence, not fear.'),
        q('Divots and ball marks get…', ['Left', 'Fixed', 'Photographed'], 1, 'Leaving the course better is part of the game.'),
      ],
    },
    {
      week: 6,
      title: 'The family cup',
      videoId: null,
      homework: 'Family match at a short course, front nine. Winner names the trophy. Photo the card; the app tracks the rematches.',
      quiz: [
        q('The point of week 6 is…', ['A junior tour card', 'A family game you will actually keep playing', 'Buying new clubs'], 1, 'The habit is the win; the cup is the excuse.'),
        q('Progress since week 1 shows up as…', ['Longer drives only', 'More holed putts, better pace, more fun', 'Nothing measurable'], 1, 'The app&rsquo;s round history makes it visible.'),
        q('What comes after the program?', ['Stopping', 'Rematches, and lessons with the pro when ready', 'Only watching golf on TV'], 1, 'The family cup becomes a standing game.'),
      ],
    },
  ],
}

/**
 * 12 weeks, gender-neutral, for the true beginner. The design goal is not a
 * better swing — it is CONVERSION: turning someone who was curious about golf
 * into someone who plays regularly. NGF estimates over 20 million Americans
 * are very interested in on-course golf but did not play last year; this
 * program is the on-ramp for them. Every week ends with a reason to come back.
 */
export const FIRST_90_DAYS: ProgramSpec = {
  slug: 'first-90-days',
  name: 'Your First 90 Days of Golf',
  description:
    'Twelve weeks from "never held a club" to "I play golf now." No prior experience, no equipment needed to start — rentals are fine and week 2 tells you what to borrow. Short lessons at home, low-pressure practice in the world, and by the end: three real outings played, your own scoring history, and a standing game. Flipped classroom with quick quizzes that build confidence, not stress. Draft curriculum pending Tom Harris review.',
  priceMinor: 9900,
  currency: 'usd',
  weeks: [
    {
      week: 1,
      title: 'Hold a club, hit a ball',
      videoId: 'JNYa-7n6KhI',
      homework: 'One range visit with rented or borrowed clubs: a small bucket, short irons only. Goal is contact, not distance. Ten minutes of grip practice at home first.',
      quiz: [
        q('To start golf you need…', ['A full set of new clubs', 'Any club you can borrow or rent', 'Lessons first'], 1, 'Rentals and borrowed clubs are how most golfers start.'),
        q('Week 1 success is…', ['200-yard drives', 'Making contact and enjoying it', 'Breaking 100'], 1, 'Contact and fun; everything else comes later.'),
        q('The club is held…', ['Tight like a hammer', 'Secure but relaxed, in the fingers', 'With gloves on both hands'], 1, 'Tension is the beginner&rsquo;s biggest tax.'),
      ],
    },
    {
      week: 2,
      title: 'The half swing is your whole game (for now)',
      videoId: 'sFCHZ4ozj8c',
      homework: 'Range visit two: 30 balls, all half swings with an 8- or 9-iron. Count your clean strikes out of every ten.',
      quiz: [
        q('Beginners improve fastest by…', ['Swinging as hard as possible', 'Short swings that strike the ball cleanly', 'Buying a driver'], 1, 'Clean contact scales up; wild speed does not.'),
        q('Counting strikes out of ten gives you…', ['Stress', 'A number you can watch improve', 'Nothing'], 1, 'Progress you can see is why people come back.'),
        q('Which clubs do you need this week?', ['All fourteen', 'One or two short irons', 'A putter only'], 1, 'One club, repeated, teaches more than a full bag.'),
      ],
    },
    {
      week: 3,
      title: 'Putting: the equalizer',
      videoId: null,
      homework: 'Twenty minutes on any practice green: ladder drill to 10, 20, 30 feet, then ten 3-footers in a row. Free, no tee time needed.',
      quiz: [
        q('The part of golf where a beginner can match a veteran soonest is…', ['Driving', 'Putting', 'Bunkers'], 1, 'Touch beats strength on the green.'),
        q('Practice greens usually cost…', ['A green fee', 'Nothing', 'A membership'], 1, 'Most courses let you putt free — the cheapest golf there is.'),
        q('Speed or line — which matters more from long range?', ['Line', 'Speed', 'Neither'], 1, 'Good speed means two putts from anywhere.'),
      ],
    },
    {
      week: 4,
      title: 'Chipping and your first up-and-down',
      videoId: 'lO1TiiPMMx8',
      homework: 'Short-game area: 20 chips landing on a towel, then play "chip and one putt" — chip, then hole out. Track your best streak.',
      quiz: [
        q('A chip is…', ['A tiny swing that gets the ball rolling', 'A full swing with a wedge', 'A putt with loft'], 0, 'Small motion, early landing, lots of roll.'),
        q('An up-and-down means…', ['Chip on, one putt', 'Two chips', 'A lost ball'], 0, 'The scoring skill that saves beginners strokes fast.'),
        q('Your target when chipping is…', ['The hole', 'A landing spot short of the hole', 'The far edge'], 1, 'Pick where it lands; the roll does the rest.'),
      ],
    },
    {
      week: 5,
      title: 'First outing: pitch-and-putt',
      videoId: null,
      homework: 'Play 9 holes at a pitch-and-putt or par-3 course. Rentals are fine. Photograph the scorecard into the app — your history starts today.',
      quiz: [
        q('Short courses are…', ['Practice, not real golf', 'Real golf and the best first outing', 'Embarrassing'], 1, 'Off-course and short-course golf is golf, full stop.'),
        q('Your first scorecard matters because…', ['It will be framed', 'It is the baseline everything improves from', 'It doesn&rsquo;t'], 1, 'You cannot see progress without a starting point.'),
        q('Pace on a busy short course means…', ['Rushing your swings', 'Being ready when it&rsquo;s your turn', 'Skipping holes'], 1, 'Ready golf keeps it relaxed for everyone.'),
      ],
    },
    {
      week: 6,
      title: 'Reading the card, playing the game',
      videoId: null,
      homework: 'Learn your scorecard: par, handicap holes, tees. Then nine holes again — count only putts and penalties this time.',
      quiz: [
        q('Par is…', ['A requirement', 'A reference score for very good play', 'The minimum'], 1, 'Beginners measure against their own last round, not par.'),
        q('Different tee boxes exist so that…', ['Better players show off', 'Everyone plays a course that fits their distance', 'Groundskeepers stay busy'], 1, 'Playing forward tees is smart, not soft.'),
        q('Counting putts and penalties shows…', ['Nothing', 'Where beginner strokes actually leak', 'Your handicap'], 1, 'It aims your practice where it pays.'),
      ],
    },
    {
      week: 7,
      title: 'The driver, finally',
      videoId: 'A6rHcqT4Uqs',
      homework: 'Range visit: 15 half-swing drivers off a high tee, then 15 smooth full ones. Fairway-finder first; the hero swing can wait.',
      quiz: [
        q('The driver comes this late because…', ['It&rsquo;s illegal earlier', 'Contact skills transfer up; wildness doesn&rsquo;t transfer down', 'It&rsquo;s unimportant'], 1, 'The short-club foundation makes the driver learnable.'),
        q('Off the tee, your first goal is…', ['Maximum distance', 'In play, findable, hittable again', 'Backspin'], 1, 'A findable ball beats a long lost one.'),
        q('Teeing the driver high helps you…', ['Look professional', 'Hit up on the ball', 'Nothing'], 1, 'An upward strike is the driver&rsquo;s natural shape.'),
      ],
    },
    {
      week: 8,
      title: 'Nine holes on a full course',
      videoId: null,
      homework: 'Book a quiet-time nine (the app suggests when). Play from the forward tees. Photo the card. One goal: finish every hole.',
      quiz: [
        q('Booking off-peak means…', ['Worse golf', 'Space to learn without pressure', 'Higher fees'], 1, 'Quiet tee times are the beginner&rsquo;s friend.'),
        q('If a hole goes badly wrong you…', ['Replay it until perfect', 'Pick up, take a max score, enjoy the next', 'Quit'], 1, 'Casual golf allows mercy; momentum matters more.'),
        q('Forward tees are for…', ['Juniors only', 'Anyone whose distances fit them', 'Nobody'], 1, 'Right-sized golf is more fun and builds faster.'),
      ],
    },
    {
      week: 9,
      title: 'Play with strangers (it&rsquo;s fine)',
      videoId: null,
      homework: 'Join a walk-on pairing, a scramble, or a league night — one round with people you did not arrive with.',
      quiz: [
        q('Most golfers paired with a beginner are…', ['Annoyed', 'Friendly and remember being new', 'Silent'], 1, 'Golf culture is kinder than beginners fear.'),
        q('What you owe a pairing is…', ['A great score', 'Pace and safety', 'Jokes'], 1, 'Keep up and stay aware; nobody cares about your score.'),
        q('Leagues and scrambles are good because…', ['Low pressure, built-in company, standing games', 'They pay money', 'They&rsquo;re mandatory'], 0, 'A standing game is the #1 reason people keep playing.'),
      ],
    },
    {
      week: 10,
      title: 'Your distances, your clubs',
      videoId: 'D4ONSmxTVPQ',
      homework: 'Range with the app: measure your real carry with each club you use. Decide what your (rented or owned) starter half-set should be.',
      quiz: [
        q('A beginner&rsquo;s bag needs…', ['14 clubs', 'A half set they actually know', 'The newest release'], 1, 'Fewer clubs, known numbers, better choices.'),
        q('Buying clubs makes sense…', ['Before your first swing', 'Once you know your game and distances', 'Never'], 1, 'Week 10 you finally know what fits you.'),
        q('Your club choice on the course comes from…', ['The number on the club', 'Your measured carries', 'Your partner&rsquo;s advice'], 1, 'Your own numbers are the only chart that matters.'),
      ],
    },
    {
      week: 11,
      title: 'Strategy: play smart, score better',
      videoId: null,
      homework: 'Nine holes played to the app&rsquo;s club and target calls: middle of greens, safe sides, take the bogey. Compare the card to week 6.',
      quiz: [
        q('The smart target on approach is usually…', ['The pin', 'The middle of the green', 'Short-side'], 1, 'Middle of the green makes doubles rare.'),
        q('When water guards a side you…', ['Challenge it', 'Aim away and accept a longer putt', 'Close your eyes'], 1, 'Delete the big number; keep the round alive.'),
        q('A bogey for a new golfer is…', ['A failure', 'A good hole', 'Impossible'], 1, 'Bogey golf is genuinely good golf in your first year.'),
      ],
    },
    {
      week: 12,
      title: 'Day 90: you play golf now',
      videoId: null,
      homework: 'Full nine (or eighteen) with someone from week 9, or your household. Photo the card. Book the next game before you leave the parking lot.',
      quiz: [
        q('The single best predictor you&rsquo;ll still play next year is…', ['A new driver', 'A standing game already booked', 'Talent'], 1, 'The next tee time is the whole ballgame — book it same-day.'),
        q('Your 90-day progress lives in…', ['Memory', 'Your round history in the app', 'A drawer'], 1, 'The data shows how far you&rsquo;ve come and feeds your coaching next.'),
        q('What are you now?', ['Still a beginner, forever', 'A golfer', 'A spectator'], 1, 'Three outings, a scoring history, a standing game: golfer.'),
      ],
    },
  ],
}

/**
 * 4-week putting intensive. Putting is where amateurs bleed the most fixable
 * strokes, where a beginner can match a veteran soonest, and where Tom's
 * teaching is deepest (SAM PuttLab certified per his TPI profile). Weeks 1 and
 * 4 bracket the course with the same benchmark test, so improvement is a
 * number, not a feeling.
 */
export const PUTTING_FOUR_WEEK: ProgramSpec = {
  slug: 'putting-intensive-4',
  name: 'Putting Intensive — 4 Weeks',
  description:
    'Four weeks on the green and nothing else: start line, speed, green reading, and holing out under pressure. You take the same 18-putt benchmark test in week 1 and week 4, so your improvement is measured, not guessed. Works on a practice green, a carpet, or a simulator — no course required. Flipped classroom: short lesson at home, focused drills on the green, a quick quiz to lock in the why. Draft curriculum pending Tom Harris review.',
  priceMinor: 8900,
  currency: 'usd',
  weeks: [
    {
      week: 1,
      title: 'Benchmark and start line',
      videoId: null,
      homework: 'Take the benchmark: 18 putts — six from 3 feet, six from 10, six from 25 — and record makes and total putts in the app. Then the gate drill: ten minutes rolling balls through a gate two putter-heads wide at 6 feet.',
      quiz: [
        q('Where the ball starts is decided almost entirely by…', ['The putter face at impact', 'Your follow-through', 'The brand of ball'], 0, 'Face angle dominates start line; the path matters far less than most golfers think.'),
        q('The benchmark test exists so that…', ['You feel judged', 'Week 4 shows a measured change, not a feeling', 'You can skip practice'], 1, 'Same test, same distances, four weeks apart — the difference is your progress.'),
        q('A putt that misses the gate tells you…', ['You need a new putter', 'Your face was open or closed at impact', 'The green is bad'], 1, 'The gate turns an invisible face error into instant feedback.'),
      ],
    },
    {
      week: 2,
      title: 'Speed is everything',
      videoId: null,
      homework: 'Ladder drill both sessions this week: 10, 20, 30 feet, each ball finishing past the last without racing by. Finish with the 3-foot circle game: six putts around one hole, restart on any miss.',
      quiz: [
        q('Three-putts are killed mostly by…', ['Perfect line', 'Speed control', 'A softer grip'], 1, 'Good speed makes every long putt finish near the hole; line alone cannot.'),
        q('A good lag putt finishes…', ['Anywhere past the hole', 'Inside a short, stress-free circle around the hole', 'Short every time'], 1, 'Think bin-lid circle; two-putt territory, no drama.'),
        q('Speed is controlled by…', ['Stroke length at even tempo', 'Hitting harder with the wrists', 'Holding your breath'], 0, 'Longer stroke, same rhythm — never a jab.'),
      ],
    },
    {
      week: 3,
      title: 'Reading the green',
      videoId: null,
      homework: 'Read-then-roll: on ten different putts, commit to a read out loud before you stroke it, then note whether the miss was read or speed. Walk the low side; feel slope through your feet.',
      quiz: [
        q('Break depends on…', ['Slope only', 'Slope AND the speed you choose', 'The wind'], 1, 'A firmer putt breaks less, a dying putt breaks most — read and speed are one decision.'),
        q('The clearest view of a putt&rsquo;s break is usually from…', ['Behind the ball only', 'The low side of the putt', 'The hole looking back'], 1, 'Gravity shows itself best from below the line.'),
        q('When your read and your friend&rsquo;s read disagree, play…', ['Theirs', 'Yours, committed', 'Split the difference'], 1, 'A committed stroke on your own read beats a doubtful one on anyone&rsquo;s.'),
      ],
    },
    {
      week: 4,
      title: 'Pressure, then proof',
      videoId: null,
      homework: 'Pressure sets: make ten 3-footers in a row before leaving, twice this week. Then retake the full 18-putt benchmark and log it — compare to week 1 in the app.',
      quiz: [
        q('Pressure practice works because…', ['It punishes you', 'A streak with a cost simulates the putt that matters', 'It is longer'], 1, 'Restarting on a miss gives practice a consequence, like the real thing.'),
        q('Your week-4 benchmark compares against…', ['The course record', 'Your own week-1 numbers', 'Tour averages'], 1, 'You versus you: that is the whole scoreboard.'),
        q('After the intensive, your putting keeps improving by…', ['Hoping', 'Keeping the ladder and gate drills in your weekly routine', 'Buying putters'], 1, 'Ten focused minutes a week holds the gains; the app keeps the streaks.'),
      ],
    },
  ],
}


/**
 * 4-week practice-skills clinic. Most beginners don't know HOW to practice —
 * range structure, drills that stick, tracking, and the pre-round warm-up.
 * Meta-skill: every other program lands better after this one.
 */
export const PRACTICE_FOUR_WEEK: ProgramSpec = {
  slug: 'practice-like-a-golfer-4',
  name: 'Practice Like a Golfer — 4 Weeks',
  description:
    'Four weeks on the skill nobody teaches: practicing. How to structure a range bucket so it changes your game, the putting and wedge drills worth repeating, how to track progress so improvement is visible, and the 20-minute warm-up that readies you for a round. Draft curriculum pending Tom Harris review.',
  priceMinor: 7900,
  currency: 'usd',
  weeks: [
    {
      week: 1,
      title: 'The range bucket, structured',
      videoId: null,
      homework: 'Two range visits with a written 40-ball plan: 10 wedges to a target, 15 mid-irons alternating targets, 10 drivers to a fairway window, 5 pressure balls calling each shot. Every ball has a target.',
      quiz: [
        q('Beating balls with the same club at nothing trains…', ['Your swing', 'Very little — no target, no transfer', 'Distance'], 1, 'Practice transfers when every ball has a target and a purpose.'),
        q('Mixing clubs and targets (random practice) beats blocked repeats for…', ['Warm-ups only', 'Taking it to the course', 'Nothing'], 1, 'Random practice feels worse and transfers better — like real golf, every shot is new.'),
        q('A range session should end with…', ['The driver, max speed', 'A few pressure balls where you call the shot', 'Whatever is left'], 1, 'Finish like you play: one target, one swing, consequences.'),
      ],
    },
    {
      week: 2,
      title: 'Drills that stick: putting and wedges',
      videoId: 'D4ONSmxTVPQ',
      homework: 'Two 20-minute sessions: putting ladder (10/20/30 ft) plus the 6-foot gate drill, then the wedge clock — half, three-quarter and full swings with one wedge, carries written down.',
      quiz: [
        q('A drill is worth repeating when it has…', ['A cool name', 'A target, feedback, and a score', 'Lots of equipment'], 1, 'Target + feedback + score is what makes practice measurable.'),
        q('The wedge clock exists to give you…', ['One perfect swing', 'Known carries at several swing lengths', 'More spin'], 1, 'Scoring golf is playing to numbers you own.'),
        q('Short game deserves what share of practice time?', ['Almost none', 'Roughly half', 'All of it'], 1, 'Half your strokes happen inside 100 yards; practice like it.'),
      ],
    },
    {
      week: 3,
      title: 'Track it or it did not happen',
      videoId: null,
      homework: 'Add numbers to everything this week: strikes-out-of-ten each range visit, putting benchmark in the app, wedge carries updated. Three lines of notes after each session — what worked, what did not, next focus.',
      quiz: [
        q('Progress you cannot see is…', ['Still motivating', 'The main reason people quit practicing', 'Impossible'], 1, 'Visible numbers are why people come back; the app keeps them for you.'),
        q('A practice journal needs…', ['A page per day', 'Three honest lines', 'Photos'], 1, 'Small and consistent beats elaborate and abandoned.'),
        q('Retesting the same benchmark matters because…', ['Variety is boring', 'Same test, same conditions — the change is real', 'It is tradition'], 1, 'Only a repeated measure shows true movement.'),
      ],
    },
    {
      week: 4,
      title: 'The pre-round warm-up',
      videoId: null,
      homework: 'Build and rehearse your 20-minute warm-up: 5 minutes stretch and half swings, 8 minutes through the bag short to long, 2 minutes trouble shots, 5 minutes putting ladder. Then play nine using it and log the round.',
      quiz: [
        q('A warm-up&rsquo;s job is…', ['Fixing your swing', 'Finding today&rsquo;s rhythm and tempo', 'Maximum speed'], 1, 'Warm-ups prepare; lessons and range sessions fix.'),
        q('Warm up short clubs first because…', ['Tradition', 'Contact and tempo build before speed', 'Wedges are cheap'], 1, 'Small swings groove strike quality; the driver comes last.'),
        q('The last five minutes before the first tee are best spent…', ['Hitting drivers', 'On the putting green, feeling the speed', 'In the shop'], 1, 'Green speed is the first thing the course asks you about.'),
      ],
    },
  ],
}


/**
 * Single-session workshop: what gear a beginner actually needs. Ninety minutes,
 * one price, no subscription — the on-ramp before anyone spends real money on
 * clubs. Pairs with the starter-kit bundle and Tom's fitting certification.
 */
export const EQUIPMENT_BASICS: ProgramSpec = {
  slug: 'equipment-basics-1',
  name: 'Equipment & Fitting Basics — Single Session',
  description:
    'One 90-minute workshop on gear without the sales pitch: the half set a beginner actually needs, how to buy used clubs well, choosing a ball, glove and shoes, setting up a bag, and when a professional fitting is worth it (and when it is not yet). Draft curriculum pending Tom Harris review.',
  priceMinor: 4900,
  currency: 'usd',
  weeks: [
    {
      week: 1,
      title: 'Gear that fits your game and your budget',
      videoId: null,
      homework: 'Before the session: list what you own and what you think you need. After: price a used half set online, pick one ball model to play for a month, and bring your questions to the group thread.',
      quiz: [
        q('A beginner&rsquo;s first bag should hold…', ['14 new clubs', 'A half set you actually know', 'Whatever was on sale'], 1, 'Fewer clubs, known distances, better golf — and far cheaper.'),
        q('Used clubs are…', ['Risky', 'The smart way to start — most of the value, a fraction of the price', 'Against the rules'], 1, 'Check the grips and faces; let someone else pay the new-club premium.'),
        q('A professional fitting matters most…', ['Before your first lesson', 'Once your swing repeats and you know your carries', 'Never'], 1, 'Fit a swing that exists; week one money goes to lessons and balls.'),
      ],
    },
  ],
}


/**
 * Seasonal in-person clinic (not self-paced): four Wednesday mornings with Tom
 * at Butler Pitch & Putt, a laid-back downtown short course. The gentlest
 * possible on-ramp — a real, low-pressure beginner option, launched as a
 * November holiday / Black Friday special and sold as a giftable package.
 */
export const BUTLER_CLINIC: ProgramSpec = {
  slug: 'butler-beginner-clinic-4',
  name: 'Beginner Mornings at Butler Pitch & Putt',
  description:
    "Four Wednesday mornings with Tom at Butler Pitch \u0026 Putt, a relaxed downtown short course \u2014 the friendliest way to start golf. Short holes, no pressure, real coaching, coffee weather. A holiday-season special and a genuinely good gift for the curious beginner in your life. In-person clinic (not self-paced). Draft curriculum pending Tom Harris review.",
  priceMinor: 12900,
  currency: 'usd',
  weeks: [
    {
      week: 1,
      title: 'Meet the game: putting & the short hole',
      videoId: null,
      homework: "Just show up. We start on the green and the shortest holes \u2014 you'll hit good shots on day one.",
      quiz: [
        q('The best first club for a brand-new golfer is usually the\u2026', ['Driver', 'Putter or wedge on a short hole', 'A 3-iron'], 1, 'Short shots build confidence and contact first.'),
        q('A pitch-and-putt is\u2026', ['Not real golf', 'Real golf, on a friendly scale', 'Only for kids'], 1, 'Short courses are where a lot of great golfers fell in love with the game.'),
        q('What do you need to bring week one?', ['Your own clubs', 'Nothing \u2014 rentals and clubs are provided', 'A handicap'], 1, 'Come as you are; gear is sorted.'),
      ],
    },
    {
      week: 2,
      title: 'The little swing',
      videoId: 'sFCHZ4ozj8c',
      homework: 'Between sessions, ten minutes of mirror swings at home \u2014 no ball, just the motion Tom showed you.',
      quiz: [
        q('A good beginner swing is\u2026', ['As hard as possible', 'Smooth and balanced', 'Copied from TV'], 1, 'Balance and rhythm beat effort every time.'),
        q('Where should your eyes be at impact?', ['On the target', 'On the ball', 'Closed'], 1, 'See the ball, strike the ball.'),
        q('Practice at home this week means\u2026', ['Nothing', 'A few minutes of slow swings', 'Hours of range work'], 1, 'Small and steady wins for beginners.'),
      ],
    },
    {
      week: 3,
      title: 'Chipping around the green',
      videoId: 'lO1TiiPMMx8',
      homework: 'Notice one thing that improved since week one, and tell Tom next session. Confidence is the goal.',
      quiz: [
        q('A chip mostly\u2026', ['Flies high', 'Rolls after a little hop', 'Spins back'], 1, 'Land it early, let it roll.'),
        q('When a shot goes badly, you\u2026', ['Get upset', 'Laugh, reset, hit the next one', 'Go home'], 1, 'Golf rewards a short memory and good company.'),
        q('The point of these mornings is\u2026', ['A perfect score', 'Fun, confidence, and coming back', 'Turning pro'], 1, 'Curiosity into commitment, one Wednesday at a time.'),
      ],
    },
    {
      week: 4,
      title: 'Play the whole thing',
      videoId: null,
      homework: 'Play all nine short holes with the group, keep your own score for the first time, and book your next round before you leave.',
      quiz: [
        q('After four mornings you are\u2026', ['Still not a golfer', 'A golfer', 'A spectator'], 1, 'You played, you improved, you belong.'),
        q('The best way to keep going is\u2026', ['Stop', 'A standing game or the next class', 'Watching golf only'], 1, 'A next date on the calendar is what makes it stick.'),
        q('This clinic makes a good\u2026', ['Secret', 'Holiday gift for a curious beginner', 'Nothing'], 1, 'Giftable, friendly, and genuinely fun.'),
      ],
    },
  ],
}

export const ALL_PROGRAMS: ProgramSpec[] = [
  EIGHT_WEEK,
  SIX_WEEK,
  WOMENS_SIX_WEEK,
  FAMILY_SIX_WEEK,
  FIRST_90_DAYS,
  PUTTING_FOUR_WEEK,
  PRACTICE_FOUR_WEEK,
  EQUIPMENT_BASICS,
  BUTLER_CLINIC,
]
