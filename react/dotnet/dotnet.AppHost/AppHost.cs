var builder = DistributedApplication.CreateBuilder(args);

// Disable HTTPS certificate validation for development
System.Net.ServicePointManager.ServerCertificateValidationCallback = 
    (sender, certificate, chain, sslPolicyErrors) => true;

var server = builder.AddProject<Projects.dotnet_Server>("server")
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints();

var webfrontend = builder.AddViteApp("webfrontend", "../frontend")
    .WithReference(server)
    .WaitFor(server);

server.PublishWithContainerFiles(webfrontend, "wwwroot");

builder.Build().Run();
