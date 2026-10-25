using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
#if PAGES_STANDALONE
using MdViewer.Client;
#endif

var builder = WebAssemblyHostBuilder.CreateDefault(args);
#if PAGES_STANDALONE
builder.RootComponents.Add<Routes>("#app");
#endif

await builder.Build().RunAsync();
