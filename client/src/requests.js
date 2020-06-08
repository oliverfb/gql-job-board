import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from 'apollo-boost';
import gql from 'graphql-tag';
import { getAccessToken, isLoggedIn } from './auth';

const endpointURL = 'http://localhost:9000/graphql';

const authLink = new ApolloLink((operation, forward) => {
  if (isLoggedIn()) {
    operation.setContext({
      headers: { authorization: `Bearer ${getAccessToken()}` }
    });
  }
  return forward(operation);
});

const client = new ApolloClient({
  link: ApolloLink.from([
    authLink,
    new HttpLink({ uri: endpointURL })
  ]),
  cache: new InMemoryCache()
});

const jobDetailFragment = gql`
  fragment JobDetail on Job {
    id title description
    company { id name }
  }
`;

const createJobMutation = gql`mutation CreateJob($input: CreateJobInput) {
  job: createJob(input: $input) {
   ...JobDetail
  }
}${jobDetailFragment}`;

const jobQuery = gql`query JobQuery($id: ID!) {
  job (id: $id) {
    ...JobDetail
  }
}${jobDetailFragment}`;

const jobsQuery = gql`{
  jobs {
    id title
    company { id name }
  }
}`;

const companyQuery = gql`query CompanyQuery ($id: ID!) {
  company (id: $id) { id name description
    jobs { id title }
  }
}`;

export async function createJob(input) {
  const { data } = await client.mutate({
    mutation: createJobMutation,
    variables: { input },
    update: (cache, { data }) => {
      cache.writeQuery({
        query: jobQuery,
        variables: { id: data.job.id },
        data
      })
    }
  });
  return data.job;
}

export async function loadJob(id) {
  const { data } = await client.query({ query: jobQuery, variables: { id } });
  return data.job;
}

export async function loadJobs() {
  const { data } = await client.query({ query: jobsQuery, fetchPolicy: 'no-cache' });
  return data.jobs;
}

export async function loadCompany(id) {
  const { data } = await client.query({ query: companyQuery, variables: { id } });
  return data.company;
}
