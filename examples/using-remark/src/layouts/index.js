import React from "react"
import Link from "gatsby-link"
import { rhythm, scale } from "../utils/typography"
import styles from "../styles"
import presets from "../utils/presets"

import "typeface-space-mono"
import "typeface-spectral"

require(`prismjs/themes/prism-solarizedlight.css`)

class DefaultLayout extends React.Component {
  render() {
    const { author, homepage } = this.props.data.site.siteMetadata
    return (
      <div>
        <div>
          <Link
            to="/"
            css={{
              display: `inline-block`,
              textDecoration: `none`,
            }}
          >
            <h1
              css={{
                color: styles.colors.light,
                fontWeight: `normal`,
                lineHeight: 1,
                margin: 0,
              }}
            >
              gatsby-example-using-remark
            </h1>
          </Link>
        </div>
        <div>
          {this.props.children()}
          <div
            css={{
              color: styles.colors.light,
            }}
          >
            powered by{` `}
            <a target="_blank" href={homepage}>
              {author}
            </a>
          </div>
        </div>
      </div>
    )
  }
}

export default DefaultLayout

export const pageQuery = graphql`
  query LayoutIndexQuery {
    site {
      siteMetadata {
        author
        homepage
      }
    }
  }
`
