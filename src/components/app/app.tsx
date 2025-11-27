import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

import styles from './app.module.css';
import { pick } from '@/helpers/random';
import { Container } from '../container';
import { cn } from '@/helpers/styles';

const getRecentDate = (months: number = 6) => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);

  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

const CACHE_KEY = 'gitscovery_repos';
const CACHE_TIMESTAMP_KEY = 'gitscovery_timestamp';
const CACHE_DURATION = 1000 * 60 * 30; // half hour

export function App() {
  return (
    <div className={styles.app}>
      <div className={styles.pattern} />

      <div className={styles.wrapper}>
        <Button />
        <div className={cn(styles.lines, styles.one)} />
        <div className={cn(styles.lines, styles.two)} />
        <div className={cn(styles.circle, styles.one)} />
        <div className={cn(styles.circle, styles.two)} />
        <div className={cn(styles.dot, styles.one)} />
        <div className={cn(styles.dot, styles.two)} />
        <div className={cn(styles.dot, styles.three)} />
        <div className={cn(styles.dot, styles.four)} />
        <div className={styles.outer} />
      </div>

      <div className={styles.details}>
        <Container>
          <h1>Gitscovery</h1>
          <p className={styles.description}>Discover open-source projects.</p>
          <p className={styles.guide}>Simply click on the ball.</p>
          <div>
            <a href="https://github.com/awwwsm/gitscovery">[Source Code]</a>
          </div>
        </Container>
      </div>
    </div>
  );
}

function Button() {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;

    const { clientX, clientY } = e;
    const { height, left, top, width } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX, y: middleY });
  };

  const handleTouch = (e: React.TouchEvent<HTMLButtonElement>) => {
    const touch = e.touches[0];

    if (!ref.current || !touch) return;

    const { clientX, clientY } = touch;
    const { height, left, top, width } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX, y: middleY });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  const { x, y } = position;

  const [repos, setRepos] = useState<Array<string>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchRepos = async () => {
      /**
       * Check cache first to avoid tate limits:
       */
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      const isCacheValid =
        timestamp && Date.now() - parseInt(timestamp) < CACHE_DURATION;

      if (cached && isCacheValid) {
        setRepos(JSON.parse(cached));
        return;
      }

      setIsLoading(true);

      /**
       * Build query string:
       */
      const recentDate = getRecentDate(6);
      const minStars = pick([500, 1000, 2000, 5000]);
      const maxStars = minStars + 10_000;

      const queryParts = [
        `stars:${minStars}..${maxStars}`,
        `pushed:>${recentDate}`, // Ensures activity
        `archived:false`, // Filters out dead/read-only projects
        `is:public`,
      ];

      const randomPage = Math.floor(Math.random() * 10) + 1;

      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(queryParts.join(' '))}&sort=updated&order=desc&per_page=100&page=${randomPage}`;

      try {
        const res = await fetch(url);

        if (!res.ok) {
          if ((res.status === 403 || res.status === 429) && cached) {
            console.warn('Rate limited, using cached data.');

            setRepos(JSON.parse(cached));

            return;
          }

          throw new Error('GitHub API Error');
        }

        const json = await res.json();

        // Filter out items that might have 0 issues (often mirrors or personal backups)
        // logic: open_issues_count is usually a good proxy for "alive"
        const validUrls = json.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((item: any) => item.open_issues_count > 0)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => item.html_url);

        setRepos(validUrls);

        // Save to cache
        localStorage.setItem(CACHE_KEY, JSON.stringify(validUrls));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepos();
  }, []);

  const handleClick = () => {
    const randomRepo = pick(repos);

    if (window.open) window.open(randomRepo, '_blank')?.focus();
  };

  return (
    <motion.button
      animate={{ x, y }}
      className={styles.button}
      disabled={isLoading || repos.length === 0}
      ref={ref}
      style={{ position: 'relative' }}
      transition={{ damping: 15, mass: 0.1, stiffness: 150, type: 'spring' }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      onMouseLeave={reset}
      onMouseMove={handleMouse}
      onTouchEnd={reset}
      onTouchMove={handleTouch}
    >
      <div className={styles.noise} />

      <motion.div
        animate={{ x: x * 0.3, y: y * 0.3 }}
        className={styles.one}
        transition={{ damping: 15, mass: 0.1, stiffness: 150, type: 'spring' }}
      />

      <motion.div
        animate={{ x: x * 0.2, y: y * 0.2 }}
        className={styles.two}
        transition={{
          damping: 15,
          mass: 0.1,
          stiffness: 150,
          type: 'spring',
        }}
      />

      <motion.span
        animate={{ x: x * 0.3, y: y * 0.3 }}
        transition={{
          damping: 15,
          mass: 0.1,
          stiffness: 150,
          type: 'spring',
        }}
      >
        {isLoading ? '[Loading]' : '[New Project]'}
      </motion.span>
    </motion.button>
  );
}
