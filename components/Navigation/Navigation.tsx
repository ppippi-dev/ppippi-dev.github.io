import Link from 'next/link'
import Image from 'next/image'
import {
  aboutLink,
  bold,
  container,
  content,
  iconButton,
  logoEmoji,
  navControlList,
  navControlListItem,
  navTitleContainer,
  title,
} from './styles.css'

import githubLogo from '@/public/icons/github_logo.svg'

export function Navigation() {
  return (
    <nav className={container}>
      <div className={content}>
        <Link href="/" className={navTitleContainer}>
          <span className={logoEmoji}>✅</span>
          <h1 className={title}>
            <span className={bold}>Ppippi</span> Blog
          </h1>
        </Link>

        <ul className={navControlList}>
          <li className={navControlListItem}>
            <a 
              href="https://github.com/ppippi-dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className={iconButton}
            >
              <Image src={githubLogo} alt="깃허브" />
            </a>
          </li>
        </ul>
      </div>
    </nav>
  )
}
