import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const code = url.searchParams.get('code');
	const provider = 'github';

	try {
		if (!code) {
			throw new Error(`Missing code ${code}`);
		}

		const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify({
				client_id: process.env.DECAP_GITHUB_CLIENT_ID,
				client_secret: process.env.DECAP_GITHUB_CLIENT_SECRET,
				code
			})
		});

		const tokenData = await tokenRes.json();

		if (tokenData.error) {
			throw new Error(tokenData.error);
		}

		const responseBody = `
      <script>
        const receiveMessage = (message) => {
          window.opener.postMessage(
            'authorization:${provider}:success:${JSON.stringify({
				token: tokenData.access_token,
				provider
			})}',
            message.origin
          );

          window.removeEventListener("message", receiveMessage, false);
        }
        window.addEventListener("message", receiveMessage, false);

        window.opener.postMessage("authorizing:${provider}", "*");
      </script>
    `;

		return new Response(responseBody, {
			status: 200,
			headers: {
				'Content-Type': 'text/html'
			}
		});
	} catch (e) {
		const responseBody = `
      <script>
        const receiveMessage = (message) => {
          window.opener.postMessage(
            'authorization:${provider}:error:${JSON.stringify(e)}',
            message.origin
          );

          window.removeEventListener("message", receiveMessage, false);
        }
        window.addEventListener("message", receiveMessage, false);

        window.opener.postMessage("authorizing:${provider}", "*");
      </script>
    `;

		return new Response(responseBody, {
			status: 200,
			headers: {
				'Content-Type': 'text/html'
			}
		});
	}
};
