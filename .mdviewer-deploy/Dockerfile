FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
COPY publish/ .
EXPOSE 8080
ENTRYPOINT ["dotnet", "MdViewer.dll"]
