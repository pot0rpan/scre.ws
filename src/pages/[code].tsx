import { NextPageContext, NextPage } from 'next';
import cookies from 'next-cookies';

import { UrlClientObjectType } from '../types/url';
import { BASE_URL, SECRET_URLS } from '../config';
import { COOKIE_SKIP_REDIRECT_CONFIRMATION } from '../config/cookies';
import { stringIncludesSubstring } from '../utils';
import Layout from '../components/Layout';
import RedirectInfo from '../components/RedirectInfo';
import NotFound404 from '../components/NotFound404';
import AuthorizeUrl from '../components/AuthorizeUrl';

interface UrlResponseType {
  url?: UrlClientObjectType;
  message?: string;
  passwordRequired?: boolean;
}

export async function getServerSideProps(ctx: NextPageContext) {
  const { code } = ctx.query;
  const skipConfirmation = cookies(ctx)[COOKIE_SKIP_REDIRECT_CONFIRMATION];
  let url: UrlClientObjectType | null = null;
  let passwordRequired: boolean = false;

  if (code) {
    try {
      const res = await fetch(`${BASE_URL}/api/url/${code}`);
      const data: UrlResponseType = await res.json();

      if (res.status === 401 || data.passwordRequired) {
        passwordRequired = true;
      } else if (data.url) {
        url = data.url;
      } else {
        ctx.res.statusCode = res.status;
      }
    } catch (err) {
      console.log('/[code] getServerSideProps catch(err):\n', err);
    }
  }

  // Redirect without showing confirmation page
  if (
    !passwordRequired &&
    url &&
    skipConfirmation &&
    !stringIncludesSubstring(url.longUrl, SECRET_URLS)
  ) {
    const { res } = ctx;
    res.setHeader('location', url.longUrl);
    res.statusCode = 302;
    return res.end();
  }

  return {
    props: {
      code,
      url,
      passwordRequired,
    },
  };
}

interface Props {
  code: string;
  url: UrlClientObjectType | null;
  passwordRequired: boolean;
}

const Page: NextPage<Props> = ({ code, url, passwordRequired }) => {
  if (url) {
    const isSecretUrl = stringIncludesSubstring(url.longUrl, SECRET_URLS);

    return (
      <Layout
        title={`/${code}`}
        description={
          isSecretUrl
            ? undefined
            : `Landing page for redirect to ${url.longUrl}`
        }
        ogImage={isSecretUrl ? undefined : url.preview?.image?.url}
        ogUrl={isSecretUrl ? undefined : `${BASE_URL}/${url.code}`}
      >
        <RedirectInfo url={url} />
      </Layout>
    );
  } else if (passwordRequired) {
    return (
      <Layout
        title={`/${code}`}
        description="Password is required to access this content."
      >
        <AuthorizeUrl code={code} />
      </Layout>
    );
  } else {
    return (
      <Layout title="/ Page not found">
        <NotFound404 />
      </Layout>
    );
  }
};

export default Page;
