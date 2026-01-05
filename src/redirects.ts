/**
 * Redirect mappings from old Jekyll URLs to new Astro URLs.
 * Generated from Google Search Console 404 report.
 *
 * Old pattern: /{YYYY}/{MM}/{DD}/{slug}/
 * New pattern: /blog/{slug}/ (lowercase, hyphenated)
 */

export const redirects: Record<string, string> = {
	// Korean posts
	'/2021/09/07/pandas/': '/blog/pandas/',
	'/2021/09/14/Writing Efficient Python Code/': '/blog/writing-efficient-python-code/',
	'/2021/09/14/Writing-Efficient-Python-Code/': '/blog/writing-efficient-python-code/',
	'/2021/09/16/Writing Functions in Python/': '/blog/writing-functions-in-python/',
	'/2021/10/07/Data Processing in Shell/': '/blog/data-processing-in-shell/',
	'/2021/10/07/Data-Processing-in-Shell/': '/blog/data-processing-in-shell/',
	'/2021/10/14/Introduction to Bash Scripting/': '/blog/introduction-to-bash-scripting/',
	'/2021/10/28/objective oriented programming/': '/blog/objective-oriented-programming/',
	'/2021/11/11/Unit Testing for Data Science in Python/':
		'/blog/unit-testing-for-data-science-in-python/',
	'/2021/11/12/AWS - 아마존 웹서비스/': '/blog/aws-amazon-web-services-cloud-computing/',
	'/2021/11/12/AWS-아마존-웹서비스/': '/blog/aws-amazon-web-services-cloud-computing/',
	'/2021/11/18/Introduction to Airflow in Python/': '/blog/introduction-to-airflow-in-python/',
	'/2021/11/24/Introduction to PySpark/': '/blog/introduction-to-pyspark/',
	'/2021/11/24/Introduction-to-PySpark/': '/blog/introduction-to-pyspark/',
	'/2021/12/03/Building Data Engineering Pipelines in Python/':
		'/blog/building-data-engineering-pipelines-in-python/',
	'/2022/01/04/Introduction to AWS Boto in Python/': '/blog/introduction-to-aws-boto-in-python/',
	'/2022/01/20/Introduction to Relational Databases in SQL/':
		'/blog/introduction-to-relational-databases-in-sql/',
	'/2022/01/20/Introduction-to-Relational-Databases-in-SQL/':
		'/blog/introduction-to-relational-databases-in-sql/',
	'/2022/01/27/Database Design/': '/blog/database-design/',
	'/2022/01/29/AWS-SAA/': '/blog/aws-saa/',
	'/2022/02/03/Scala/': '/blog/scala/',
	'/2022/02/10/PySpark/': '/blog/pyspark/',
	'/2022/02/16/AWS-SAA후기/': '/blog/aws-saa-exam-review/',
	'/2022/04/24/GCP-GKE자동배포/': '/blog/gcp-gke-automated-deployment/',
	'/2022/04/24/gcp-gke-automated-deployment/': '/blog/gcp-gke-automated-deployment/',
	'/2022/05/15/Github Action을 이용한 CI구축하기/': '/blog/building-ci-with-github-actions/',
	'/2022/05/15/Github-Action을-이용한-CI구축하기/': '/blog/building-ci-with-github-actions/',
	'/2022/05/15/building-ci-with-github-actions/': '/blog/building-ci-with-github-actions/',
	'/2022/05/18/cronjob/': '/blog/cronjob/',
	'/blog/SpringBoot_서버배포/': '/blog/spring-boot-k8s-deployment/',
	'/blog/GCP환경-k8s-Sticky-Session/': '/blog/gcp-k8s-sticky-session/',
	'/blog/k8s구성하기/': '/blog/setting-up-kubernetes/',
	'/2022/09/12/dbt1/': '/blog/dbt1/',
	'/2022/09/15/회고1/': '/blog/new-developer-retrospective/',
	'/2022/09/17/GKE-워크로드아이덴티티/': '/blog/gke-workload-identity/',
	'/2022/09/17/gke-workload-identity/': '/blog/gke-workload-identity/',
	'/2022/09/17/keda 사용하기/': '/blog/using-keda-pubsub-autoscaling/',
	'/2022/09/17/keda-사용하기/': '/blog/using-keda-pubsub-autoscaling/',
	'/2022/09/17/using-keda-pubsub-autoscaling/': '/blog/using-keda-pubsub-autoscaling/',
	'/2022/10/01/GKE업데이트/': '/blog/gke-automatic-updates/',
	'/2022/10/01/gke-automatic-updates/': '/blog/gke-automatic-updates/',
	'/2022/12/19/2022년회고/': '/blog/2022-retrospective/',
	'/2025/05/03/gke-iam-role/': '/blog/gke-iam-role/',
	'/2025/05/07/llm-function-calling/': '/blog/llm-function-calling/',
	'/2025/05/16/nvidia-triton-inference-server/': '/blog/nvidia-triton-inference-server/',
	'/2025/07/03/actions-runner-controller/': '/blog/actions-runner-controller/',
	'/2025/09/15/mcp-one-page/': '/blog/mcp-one-page/',
	'/2025/10/01/openai-agent-sdk/': '/blog/openai-agent-sdk/',

	// English posts
	'/en/2021/09/16/Writing Functions in Python/': '/en/blog/writing-functions-in-python/',
	'/en/2021/10/07/Data Processing in Shell/': '/en/blog/data-processing-in-shell/',
	'/en/2021/10/14/Introduction to Bash Scripting/': '/en/blog/introduction-to-bash-scripting/',
	'/en/2021/10/28/objective oriented programming/': '/en/blog/objective-oriented-programming/',
	'/en/2021/11/11/Unit Testing for Data Science in Python/':
		'/en/blog/unit-testing-for-data-science-in-python/',
	'/en/2021/11/12/aws-amazon-web-services-cloud-computing/':
		'/en/blog/aws-amazon-web-services-cloud-computing/',
	'/en/2021/11/24/Introduction to PySpark/': '/en/blog/introduction-to-pyspark/',
	'/en/2021/12/03/Building Data Engineering Pipelines in Python/':
		'/en/blog/building-data-engineering-pipelines-in-python/',
	'/en/2022/01/04/Introduction to AWS Boto in Python/':
		'/en/blog/introduction-to-aws-boto-in-python/',
	'/en/2022/01/20/Introduction to Relational Databases in SQL/':
		'/en/blog/introduction-to-relational-databases-in-sql/',
	'/en/2022/04/24/gcp-gke-automated-deployment/': '/en/blog/gcp-gke-automated-deployment/',
	'/en/2022/08/17/terraform-3/': '/en/blog/terraform-3/',
	'/en/2022/09/12/dbt1/': '/en/blog/dbt1/',
	'/en/2022/09/17/GCP-secret-manager/': '/en/blog/gcp-secret-manager/',
	'/en/2022/09/17/using-keda-pubsub-autoscaling/': '/en/blog/using-keda-pubsub-autoscaling/',
	'/en/2022/10/01/GKE업데이트/': '/en/blog/gke-automatic-updates/',
	'/en/2023/01/08/k8s구성하기/': '/en/blog/setting-up-kubernetes/',
	'/en/2023/01/08/setting-up-kubernetes/': '/en/blog/setting-up-kubernetes/',
	'/en/2023/01/29/k8s-firewall/': '/en/blog/k8s-firewall/',
	'/en/2025/05/03/gke-iam-role/': '/en/blog/gke-iam-role/',
	'/en/2025/05/07/llm-function-calling/': '/en/blog/llm-function-calling/',
	'/en/2025/05/16/nvidia-triton-inference-server/': '/en/blog/nvidia-triton-inference-server/',
	'/en/2025/07/03/actions-runner-controller/': '/en/blog/actions-runner-controller/',

	// Static pages
	'/tags.html': '/tags/',
	'/en/tags.html': '/en/tags/',
	'/en/tags/': '/en/',
	'/search.html': '/search/',
	'/blog/': '/',
	'/en/blog/': '/en/',
	'/feed.xml': '/rss.xml',

	// Additional blog redirects (different slug formats)
	'/blog/Writing-Functions-in-Python/': '/blog/writing-functions-in-python/',
	'/2021/12/03/Building-Data-Engineering-Pipelines-in-Python/':
		'/blog/building-data-engineering-pipelines-in-python/',
	'/2022/09/15/BigSeries/': '/blog/bigseries/',
	'/en/2022/01/01/NLP_XAI/': '/en/blog/nlp_xai/',
	'/en/2022/02/10/PySpark/': '/en/blog/pyspark/',
	'/en/2022/01/29/AWS-SAA/': '/en/blog/aws-saa/',
	'/en/2022/02/03/Scala/': '/en/blog/scala/',
	'/en/2021/12/03/Building-Data-Engineering-Pipelines-in-Python/':
		'/en/blog/building-data-engineering-pipelines-in-python/',

	// Deleted posts -> redirect to home (not /blog/ to avoid chain redirects)
	// (posts that no longer exist in the current site)
	'/2021/11/13/aws-deploy-django-website/': '/',
	'/2021/11/13/AWS-웹사이트운영하기(Django)/': '/',
	'/2021/11/13/basic-git-usage-for-collaboration/': '/',
	'/2021/11/13/간단한Git사용법-협업합시다/': '/',
	'/2022/02/20/SQL_Cookbook_review/': '/',
	'/2022/02/23/Airflow_with_Docker/': '/',
	'/2022/02/25/managing-env-variables/': '/',
	'/2022/02/25/환경변수-추가하기/': '/',
	'/2022/02/25/환경변수 추가하기/': '/',
	'/2022/02/26/boto3/': '/',
	'/2022/03/06/building-simple-dashboard/': '/',
	'/2022/03/06/간단한대쉬보드/': '/',
	'/2022/03/24/google-analytics-4-book-review/': '/',
	'/2022/03/24/고객을끌어오는구글애널리틱스4/': '/',
	'/2022/03/25/aws-rds-setup-new/': '/',
	'/2022/03/25/AWS-RDS구축하기_new/': '/',
	'/2022/04/12/AWS-SQS/': '/',
	'/2022/04/22/Docker-basic/': '/',
	'/2022/05/16/Configmap/': '/',
	'/2022/08/19/terraform-5/': '/',
	'/2022/09/06/expanding-pvc-capacity/': '/',
	'/2022/09/06/pvc용량증축하기/': '/',
	'/2022/09/14/cloud-jam-intermediate-notes/': '/',
	'/2022/09/14/Cloud-Jam-중급반/': '/',
	'/2022/09/14/pushing-gcp-container-images/': '/',
	'/2022/09/14/GCP이미지푸쉬/': '/',
	'/2022/09/19/deleting-stuck-namespace/': '/',
	'/2022/09/19/namespace지우기/': '/',

	// English deleted posts
	'/en/2021/11/13/aws-deploy-django-website/': '/en/',
	'/en/2021/11/13/간단한Git사용법-협업합시다/': '/en/',
	'/en/2022/02/20/SQL_Cookbook_review/': '/en/',
	'/en/2022/02/25/managing-env-variables/': '/en/',
	'/en/2022/02/26/boto3/': '/en/',
	'/en/2022/03/06/building-simple-dashboard/': '/en/',
	'/en/2022/03/24/google-analytics-4-book-review/': '/en/',
	'/en/2022/03/25/aws-rds-setup-new/': '/en/',
	'/en/2022/03/25/AWS-RDS구축하기_new/': '/en/',
	'/en/2022/04/12/AWS-SQS/': '/en/',
	'/en/2022/04/22/Docker-basic/': '/en/',
	'/en/2022/08/19/terraform-5/': '/en/',
	'/en/2022/09/06/expanding-pvc-capacity/': '/en/',
	'/en/2022/09/06/pvc용량증축하기/': '/en/',
	'/en/2022/09/14/cloud-jam-intermediate-notes/': '/en/',
	'/en/2022/09/14/pushing-gcp-container-images/': '/en/',
};
