# Vitarka
<br>
<p align="center">
  <img src="https://user-images.githubusercontent.com/2810775/92303014-03d04d00-ef26-11ea-955a-519f484a3d64.png">
</p>

## Background
This is a personal-use project that I'm finally making public, despite the code still being a bit of a mess. I've had some friends tell me that they'd find my system worthwhile if it worked well, so hopefully I can get it there by continuing to poke at it. In short: it's a system designed for autodidacting!


As for why I called it this, I'll just quote Wikipedia:

> While initially simply referring to thought, which in present at the onset of dhyāna, the terms vitarka and vicāra were re-interpreted by the developing Abhidharma and commentarial tradition. In Theravāda, vitarka is one of the mental factors (cetasika) that apprehend the quality of an object. __It is the "initial application of attention" or the mind to its object__, while vicāra is the sustained application of the mind on an object. __Vitarka is regarded in the Theravāda tradition as an antidote for thina-middha (sloth and torpor), one of the five hindrances.__

I originally wanted to call it Vicara, but apparently that name's a bit more popular and therefore already commercially recuperated. But I like the bit about Vitarka being a bulwark against __sloth and torpor__, which is a huge part of it. What we're really interested in is both -- the entire circuit of vitarka-vicara --  and this seems like a good place to start.

Anyhow, here's how I currently use it:

1\. I keep a text file sheet in Dropbox on one of my workspaces, and a lazier version of it on my phone. It uses a pretty simple format, like so:

```
5/21/20XX

0.5 &WW^ Workthrough: SEL Html 5 -> 29% X
1.5 & Renoise: read forums on secondary highlighting, 3.0 release notes X
3 &E Read: The Launchpad -> 22% X
3.5 &DD Virtualization: get VMware running Windows 7, troubleshoot lack of 3D support  X
4 &DD Virtualization: noodle through driver issues, add PPA's and try to install drivers X
5 &DD! Virtualization: enable SNA, abandon VMware, test Space Shooter in Chrome, better! X
```
(See the [pom-parsley](https://github.com/salmonax/pom-parsley) repo for more details about the syntax.)

Lazy form:

```
8/28/2020
# 7: 12 17 22
9 mfn, 46%, palace, repetition, writing, exercise; advantage of slow xx
10.5 cybernetic brain, 258, Beer and Brunel; pivot from TUV to VSM xx
12.5 sensoria, 18%, Steyerl's junktime, Citton's attention ecology in vectoralism xx
14 oochaos, 30%, Comte, conservation, neo-Kantian physiology xx
16.5 intensive science, 51, ontology of vector fields, Quine, actualism, possible vs. virtual xx
22 complex systems, 91, functionalism in neuro, net modeling issues; social xx
```


2\. I set a timer, either at my desktop or on my phone. (There's a certain logic to it, which has deviated quite a bit from classic Pomodoro Technique<small><sup>TM</sup></small>, but isn't yet codified in the app; see [Turnip Technique](#teh-turnip)<small><sup>TM</sup></small> below.) When done, I mark it down in the sheet.

3\. The desktop webapp merges everything together and gives me a visual about what the heck I've been doing:

![What the heck I've been doing](https://user-images.githubusercontent.com/2810775/92298147-cefad080-eefa-11ea-89f7-a1610817a8fa.png)


Note that each day is divided into three five-hour blocks, which is read from the text file and marked by green lines. I was completely nocturnal that week, so of course logging over 24 hours is allowed. The idea is to structure things only loosely, while allowing for the idiosyncracies typical of the unruly.

It can also show the fitful flailing of my sometimes-awful reading habits over time:

![Fitful Flailing](https://user-images.githubusercontent.com/2810775/92298148-d1f5c100-eefa-11ea-9b65-f3e448d1c361.png)


4\. The mobile app is configured to make Casio-like beeps every hour, counting down from 5 at the top of a 5-hour block down to one. This keeps me minimalistically aware of where I am in the day. The Cordova app works in the background, though not yet by particularly battery-efficient means. Apart from that, it's in a very early state, with a set of "minimum usable tool" screens in the /proto folder, of which a few are implemented:

![Mobile Flow](https://user-images.githubusercontent.com/2810775/92298371-d7540b00-eefc-11ea-85ef-896819711da7.png)

## <a id='teh-turnip'></a> Turnip Technique<small><sup>TM</sup></small>

The classic Pomodoro Technique involves 25 minute timers with five minute breaks, with a 20 minute timer every two hours. I used to kinda-sorta do this, but over time I gradually transitioned into a whole system that worked much better for the sorts of things I like to do, at least for me.


In practice, I now tend to read in 50 minute sets and program in 100 minute sets, and I design the full day around
6-9 hours of focused activity, with constrained but highly variable break-management. A two-hour set gets its own "local" break-pool, and the entire day gets a "global" break-pool. The idea is less about enforcing *regular* breaks than about establishing the right amount of slack to increase focusing stamina; I'm both motivated by challenging material and super fidgety, so it's designed to reign in that kind of temperament.

For example: a long study day of 16 poms might last 9 hours. I'll divide this into 4 "quadropom" sessions, with 144 minutes of on-task time (for reading, I pad my poms with an extra minute, just because), and 15 minutes of break time per session. The global pool gets 50 minutes.

At the end of the session, I give myself as much of the global time as I want or need. I'll also change up the day-design; for example, I might go for 12 poms of coding in 8 hours, which gives me enough time to interleave an hour of another activity, or just goof around.

What you end up with is two levels of semi-off-the-clock commitment, which reign you back into the overall day while allowing for a variable amount of wandering around.

## Why Turnip?

The name "turnip" comes from a widget I sometimes use to pace myself through National Novel Writing Month. For some reason, the act of grilling down on something as stressful as non-stop writing made me think of pulling up turnips out of the ground in Mario 2.

To make the widget, I simply figured out how fast I could write a given story (for me, 10wpm-35wpm, depending on the difficulty of the story, or 2-4 poms per day). Then, I'd keep a counter that told me how many poms worth of work I needed to get done in order to be caught up. I normally just use a spreadsheet, but the concept is sketched out a bit in src/client/lib/turnip.js.

The reason it worked was that I never worried about my wordcount or clung to a burndown chart; all I cared about was the number. Instead of forcing myself to write every day, I'd simply wait for that number to get so mammoth that I'd completely freak out and start writing until it was back within normal bounds. In other words, it functioned as a kind of homeostat.

Essentially, I see where this is going as a generalization of that technique.

## Installation and Usage

To initiate the app:

```
npm install
npm init:droid
```

To run different pieces of it:
```
# Webapp:
npm run start

# For Android, open /native/cordova/package.json and set it to your phone's local IP
npm run build:droid

# To use a cool livereload instance that pushes from your dev computer:
npm run build:droid:live

# For Electron, will currently just print a message:
npm run build:electron
```

To deploy (to surge.sh):
```
# Open /package.json, change 'vitarka.surge.sh' to something else, and run:
npm run deploy
```

WARNING: I wouldn't try to do this just yet; it requires you to have a Dropbox account with both text files in hard-coded places, and I haven't furnished it with any examples. However, if you must, there's one more thing you need. Make a .env file in the root folder that looks like the following (see /dotenv.example):

```
PN_PUB=<pubnub publishing  key>
PN_SUB=<pubnub subscription key>
DROPBOX_CLIENT=<dropbox client id>
RESPONSIVE_VOICE=<resonsive voice id>
GOOGLE_BOOKS=<Google Books API key>
```

The only necessary one is the Dropbox client id, which you can get here: https://www.dropbox.com/developers

As for how the others are used: Pubnub is used to sync the ubiquitous timer across devices, which has a working implementation but no UX. Google is used for displaying book covers, of which an early example exists in client/src/components/BookCovers. Responsive Voice was mainly just a joke, but an example is in cordova/www_old.

## Architecture

This is a React app bundled with Webpack, using MobX for state management and pug templates for easy legibility and quick prototyping. However, as the priority has been experimentation, the MobX stores haven't yet been decomposed, and there's been no separation between UI and domain stores (with the former typically fused to individual components and the latter in a monolithic controller-esque CommonStore that depends on a few utility services). It's not *quite* a big ball of mud, but it basically is. The dependency graph looks like this:

<p align="center">
  <img src="https://user-images.githubusercontent.com/2810775/92302463-33308b00-ef21-11ea-83c6-9aceb31292ff.png">
</p>

So there might be hope, provided that each unseparated concern is extracted and polished. I probably won't rewrite it until a good chunk of the UX is done, at least in a minimal state.

## Contributing

For now, if this seems interesting (and you happen to be outrageously patient), contact me at george@nomadscience.org and we might be able to collab on making it more contrib-ready. I'd also love to exchange ideas if you've concocted a similar system,

## License

GPLv2 or later. Change my mind!


