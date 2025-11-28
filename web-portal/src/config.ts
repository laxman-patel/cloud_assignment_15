// Configuration for API URLs
// In a real app, these would be environment variables (import.meta.env.VITE_...)

export const API_URLS = {
    // Replace these with your actual LoadBalancer URLs or localhost ports
    AUTH: 'http://ae9884594fbad4a2eb88cf960a8324e2-999004572.us-east-1.elb.amazonaws.com',
    PATIENT: 'http://affd9b1a639494e95993c023569d1b3e-1503211187.us-east-1.elb.amazonaws.com',
    APPOINTMENT: 'http://a143d34ecac614e7193db4b5549dc9d4-240507666.us-east-1.elb.amazonaws.com',
    BILLING: 'http://a313b86ba5a614c0883475ff4ae3b206-1557970377.us-east-1.elb.amazonaws.com',
    LAB: "https://prod-04-2014-tasks.s3.us-east-1.amazonaws.com/snapshots/972348340999/lab_result_processor-aed0dc24-7c76-45c3-8149-b5e6c47be032?versionId=1iE.Yd9QP5gzRUbnPkN2uxNeEaftgx1P&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJHMEUCIARvl1sY6%2BelsbW1WFCfIgp2KrO3IT%2FbMcZ1FNJ%2BXVo3AiEA92ykvKa2Rv0%2F%2F76BeePWWu%2Feyn85bkz%2BYD27jgc2XjsqlAIIov%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw3NDk2Nzg5MDI4MzkiDIOqkskLLHV1H3jrviroAZ0I8cnuirX6KzcV9ROcNdEU8vQWt447MO0XJyaTt3bUbXzuNyPHPSoDSZyITyDkRYGf9ojbqAjpieCUZusVKbj9KqiN7kP000w1%2BakryRNZDNzHtOTBK4HGfVNXK4SvPTYOwyYEepQ6CKo0xE4a7AI9LYnbQ1gFaVZfaQgcoijXuJh29odAAY2NvZtRT%2BGvdd%2B89sZZeeoas0cCkPjUv6tBwjZjVDcw0wNFqjl%2BXbzpBLVpn7IpsAA8wqwF9rER0fKO5BTaflBrQP%2BRh%2Byv3%2BkNoeJ97%2BZxl79Sy%2FG8MxZ6w27ZmAairwQwnf2hyQY6jQEW84SWpjA8qo3GqN2WT3BGxyY6uh%2Fro8FrhQKNssShDSqoqEr9FjroPfsDpcdYk2hR41b9%2BGMgESLdZIdDMlwkBRxUZ7nFlQGePBJRYkN5Qlm%2BXO5dEkaxuZ%2BZtU9rwpUj%2B5jrybMAHWZOFY3%2FMCBbOpIzuO5vqSTGZGLKDrexYCoga%2FhB5C41spVFuKc%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20251127T222236Z&X-Amz-SignedHeaders=host&X-Amz-Expires=600&X-Amz-Credential=ASIA25DCYHY3W6D5JHY2%2F20251127%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Signature=50573b969b37dabd9f1640cede1c566fcbd3d0de52fc00ede8258051afb70115", // or Lambda URL
    WS_APPOINTMENT: 'ws://a143d34ecac614e7193db4b5549dc9d4-240507666.us-east-1.elb.amazonaws.com', // WebSocket on the same ELB
};

// Helper to get the correct URL (fallback to localhost if not set)
export const getApiUrl = (service: keyof typeof API_URLS) => API_URLS[service];
