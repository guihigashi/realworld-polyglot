package com.github.guihigashi.conduit.article.service;

import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import com.github.guihigashi.conduit.article.service.application.port.CommentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {"spring.grpc.server.port=0"})
class ArticleServiceApplicationTests {

    @MockitoBean
    private ArticleRepository articleRepository;

    @MockitoBean
    private CommentRepository commentRepository;

    @Test
    void contextLoads() {
    }

}
