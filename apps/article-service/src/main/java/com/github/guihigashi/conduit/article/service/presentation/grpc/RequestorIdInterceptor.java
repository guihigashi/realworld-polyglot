package com.github.guihigashi.conduit.article.service.presentation.grpc;

import io.grpc.*;
import org.springframework.stereotype.Component;

@Component
public class RequestorIdInterceptor implements ServerInterceptor {
    public static final Metadata.Key<String> REQUESTOR_ID_KEY =
            Metadata.Key.of("x-requestor-id", Metadata.ASCII_STRING_MARSHALLER);

    public static final Context.Key<String> REQUESTOR_ID_CONTEXT_KEY =
            Context.key("x-requestor-id");

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        String requestorId = headers.get(REQUESTOR_ID_KEY);

        Context context = Context.current().withValue(REQUESTOR_ID_CONTEXT_KEY, requestorId);

        return Contexts.interceptCall(context, call, headers, next);
    }
}
