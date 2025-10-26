const DEFAULT_REDIRECT_STATUS_CODE = 302;


export interface Env {
    HTTP_REDIRECTS: KVNamespace;
    REDIRECT_STATUS_CODE: number;
}


function renderErrorResponse(status_code: number) {
    /* Render an HTML response for the given HTTP response status code. */

    // Set status text for known status codes
    let status_text = "";
    switch (status_code) {
        case 404:
            status_text = "Not Found";
            break;

        case 405:
            status_text = "Method Not Allowed";
            break;

        case 500:
            status_text = "Internal Server Error";
            break;
    };

    const headers = {
        "Content-Type": "text/html",
    };

    const body = `
        <!doctype html>
        <html lang="en">
            <head><title>${status_code} ${status_text}</title></head>
            <body><h1>${status_code} ${status_text}</h1></body>
        </html>
    `;

    return new Response(body, {status: status_code, headers: headers});
}


export default {
    async fetch(request, env, ctx): Promise<Response> {
        /* Process incoming request */

        // Validate request method
        if (request.method !== "GET") {
            return renderErrorResponse(405);
        }

        const requestPath = new URL(request.url).pathname;

        // Attempt to retrieve key from KV
        let targetUrl = null;
        try {
            targetUrl = await env.HTTP_REDIRECTS.get(requestPath)
        }
        catch (error) {
            console.error(`Retrieving path "${requestPath}" from KV returned an error:`, error);
            return renderErrorResponse(500);
        }

        // Return 404 if not found
        if (targetUrl === null) {
            return renderErrorResponse(404);
        }

        // Parse target URL
        try {
            targetUrl = new URL(targetUrl)
        }
        catch (error) {
            console.error(`Target URL for path "${requestPath}" is not a valid URL:`, error);
            return renderErrorResponse(500);
        }

        // Redirect to URL
        const redirect_status_code = env.REDIRECT_STATUS_CODE || DEFAULT_REDIRECT_STATUS_CODE;
        return Response.redirect(targetUrl.toString(), redirect_status_code);
    },
} satisfies ExportedHandler<Env>;
