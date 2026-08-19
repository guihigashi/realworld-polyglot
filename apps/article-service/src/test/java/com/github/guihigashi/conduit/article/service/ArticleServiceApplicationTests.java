package com.github.guihigashi.conduit.article.service;

import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class ArticleServiceApplicationTests {

    @MockitoBean
    private ArticleRepository articleRepository;

    @Test
    void contextLoads() {
    }

}
