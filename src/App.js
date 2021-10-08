import React, { useState, useEffect } from 'react'
import { useSprings, animated, to as interpolate } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import axios from 'axios';

// These two are just helpers, they curate spring data, values that are later being interpolated into css
const to = (i) => ({
  x: 0,
  y: 0,
  scale: 1,
  rot: 0,
  delay: 0,
})
const from = (_i) => ({ x: 0, rot: 0, scale: 1.5, y: -1000 })
// This is being used down there in the view, it interpolates rotation and scale into a css transform
const trans = (r, s) =>
  `perspective(1500px) rotateY(${r / 10}deg) rotateZ(${r}deg) scale(${s})`

const allowedExt = ['jpg', 'jpeg', 'gif', 'png'];

function Deck() {
    
    const [posts, setPosts] = useState(null);
    const [nbPosts, setNbPosts] = useState(0)
    const [gone] = useState(() => new Set()) // The set flags all the cards that are flicked out
    const [props, api] = useSprings(nbPosts, i => ({
        ...to(i),
        from: from(i),
    })) // Create a bunch of springs using the helpers above

    // Create a gesture, we're interested in down-state, delta (current-pos - click-pos), direction and velocity
    const bind = useDrag(({ args: [index], active, movement: [mx], direction: [xDir], velocity: [vx] }) => {
        const trigger = vx > 0.2 // If you flick hard enough it should trigger the card to fly out
        if (!active && trigger) gone.add(index) // If button/finger's up and trigger velocity is reached, we flag the card ready to fly out
        api.start(i => {
        if (index !== i) return // We're only interested in changing spring-data for the current spring
          const isGone = gone.has(index)
          const x = isGone ? (200 + window.innerWidth) * xDir : active ? mx : 0 // When a card is gone it flys out left or right, otherwise goes back to zero
          const rot = mx / 100 + (isGone ? xDir * 10 * vx : 0) // How much the card tilts, flicking it harder makes it rotate faster
          const scale = active ? 1.1 : 1 // Active cards lift up a bit
          return {
              x,
              rot,
              scale,
              delay: undefined,
              config: { friction: 50, tension: active ? 800 : isGone ? 200 : 500 },
          }
        })
        if (!active && gone.size === nbPosts)
        setTimeout(() => {
            gone.clear()
            api.start(i => to(i))
        }, 600)
    })
    
    const getPopularByDate = date => {
        return axios.get(`https://e621.net/posts.json?tags=date%3A${date}+order%3Ascore+female+solo+clothed&limit=320`)
        // return axios.get(`https://e926.net/posts.json?tags=female+solo+order%3Ascore`)
    }

    const getYesterdayDate = () => {
      const today = new Date();
      return new Date(today.setDate(today.getDate()-1))
    };

    const getShortDate = date => {
      return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate().toString().padStart(2, "0")}`;
    };

    useEffect(() => {
      getPopularByDate(getShortDate(getYesterdayDate())).then(res => {
        const cleanedList = res?.data?.posts?.filter(item => allowedExt.includes(item?.file?.ext));
        const short = cleanedList.slice(0, 50);
        setPosts(short.reverse());
        setNbPosts(short.length);
        console.log(short);
      })
    }, [nbPosts]);

  return (
    <>
      {props.map(({ x, y, rot, scale }, i) => (
        <animated.div className={'deck'} id={i} key={i} style={{ x, y }}>
          {/* This is the card itself, we're binding our gesture to it (and inject its index so we know which is which) */}
          <animated.div
            {...bind(i)}
            style={{
              transform: interpolate([rot, scale], trans),
              backgroundImage: `url(${posts[i]?.file?.url})`,
            }}
          />
        </animated.div>
      ))}
    </>
  )
}

export default function App() {
  return (
    <div className={`flex fill center container`}>
      <Deck />
    </div>
  )
}
